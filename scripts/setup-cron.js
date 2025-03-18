// Script to set up a cron job to automatically refresh Google OAuth tokens
// Run with: node scripts/setup-cron.js

const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const projectRoot = path.resolve(__dirname, "..");
const refreshScriptPath = path.join(
  projectRoot,
  "scripts",
  "refresh-tokens.js"
);
const logPath = path.join(projectRoot, "logs");

// Ensure the logs directory exists
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}

// Get the Node.js path from the system
function getNodePath() {
  return new Promise((resolve, reject) => {
    exec("which node", (error, stdout, stderr) => {
      if (error) {
        console.error("Error finding Node.js path:", error);
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Function to prompt for user confirmation
function confirm(message) {
  return new Promise((resolve) => {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(`${message} (y/n): `, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Add the cron job
async function setupCronJob() {
  try {
    // Get the actual Node.js path
    const nodePath = await getNodePath();
    console.log(`Found Node.js at: ${nodePath}`);

    // Absolute path to the refresh script and log file
    const absRefreshScriptPath = path.resolve(refreshScriptPath);
    const absLogPath = path.join(path.resolve(logPath), "token-refresh.log");

    console.log("Setting up automatic token refresh cron job...");
    console.log(`Refresh script: ${absRefreshScriptPath}`);
    console.log(`Log file: ${absLogPath}`);

    // Generate cron job string - run every Sunday at midnight
    const cronJobString = `0 0 * * 0 cd ${projectRoot} && ${nodePath} ${absRefreshScriptPath} >> ${absLogPath} 2>&1`;

    // Show what we're about to add
    console.log("\nWill add the following cron job:");
    console.log(cronJobString);

    const proceed = await confirm("\nProceed with adding the cron job?");

    if (!proceed) {
      console.log("Operation cancelled by user");
      process.exit(0);
    }

    // Get the current crontab
    exec("crontab -l", (error, stdout, stderr) => {
      if (error && error.code !== 0 && !stdout) {
        // No crontab exists yet, create one
        stdout = "";
      }

      // Check if our job is already in the crontab
      if (stdout.includes(absRefreshScriptPath)) {
        console.log("Cron job already exists. Replacing it...");

        // Get all lines except our job
        const lines = stdout
          .split("\n")
          .filter((line) => !line.includes(absRefreshScriptPath))
          .filter((line) => line.trim().length > 0);

        // Add our job
        lines.push(cronJobString);
        const newCrontab = lines.join("\n") + "\n";

        // Write the updated crontab
        const tempFile = path.join(os.tmpdir(), "habits-crontab");
        fs.writeFileSync(tempFile, newCrontab);

        exec(`crontab ${tempFile}`, (error) => {
          if (error) {
            console.error("Failed to update crontab:", error);
            process.exit(1);
          }
          console.log("Cron job updated successfully!");
          fs.unlinkSync(tempFile);
        });
      } else {
        // Job doesn't exist yet, append it
        let newCrontab = stdout;

        // Ensure there's a trailing newline
        if (newCrontab.length > 0 && !newCrontab.endsWith("\n")) {
          newCrontab += "\n";
        }

        // Add our job
        newCrontab += cronJobString + "\n";

        // Write the updated crontab
        const tempFile = path.join(os.tmpdir(), "habits-crontab");
        fs.writeFileSync(tempFile, newCrontab);

        exec(`crontab ${tempFile}`, (error) => {
          if (error) {
            console.error("Failed to update crontab:", error);
            process.exit(1);
          }
          console.log("Cron job added successfully!");
          fs.unlinkSync(tempFile);
        });
      }
    });
  } catch (error) {
    console.error("Failed to set up cron job:", error);
    process.exit(1);
  }
}

// Run the setup
setupCronJob();
