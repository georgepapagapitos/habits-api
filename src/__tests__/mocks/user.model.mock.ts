// Mock for User model
export const User = {
  findById: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: "user123",
      username: "testuser",
      email: "test@example.com",
    }),
  }),
};
