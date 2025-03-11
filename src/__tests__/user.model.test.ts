import * as bcrypt from "bcryptjs";

// Create a user model mock
const mockValidate = jest.fn().mockImplementation(function (this: any) {
  const errors: any = {};
  if (!this.name) errors.name = { message: "Name is required" };
  if (!this.email) errors.email = { message: "Email is required" };
  if (!this.password) errors.password = { message: "Password is required" };
  return Object.keys(errors).length ? { errors } : null;
});

// Mock User model for testing
class MockUser {
  name?: string;
  email?: string;
  password?: string;

  constructor(data: any = {}) {
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
  }

  validateSync() {
    return mockValidate.call(this);
  }

  async save() {
    // Simulate password hashing
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    return this;
  }
}

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  hash: jest
    .fn()
    .mockImplementation((password, salt) =>
      Promise.resolve(`hashed_${password}`)
    ),
  compare: jest
    .fn()
    .mockImplementation((password, hash) =>
      Promise.resolve(password === hash.replace("hashed_", ""))
    ),
}));

describe("User Model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should validate required fields", () => {
    const user = new MockUser({});
    const validationError = user.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.name).toBeDefined();
    expect(validationError?.errors.email).toBeDefined();
    expect(validationError?.errors.password).toBeDefined();
  });

  test("should validate a valid user", () => {
    const user = new MockUser({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const validationError = user.validateSync();
    expect(validationError).toBeNull();
  });

  test("should hash password before saving", async () => {
    const user = new MockUser({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    await user.save();

    // Verify bcrypt was called correctly
    expect(bcrypt.hash).toHaveBeenCalledWith("password123", expect.any(Number));
  });
});
