import * as fs from 'fs/promises';
import * as path from 'path';

export interface User {
  id: string;
  email: string;
  password: string;
}

export interface UserData {
  users: User[];
}

export class UserStorage {
  private readonly filePath: string;

  constructor() {
    // Store users.json in src/data/ directory
    this.filePath = path.join(__dirname, '..', 'data', 'users.json');
  }

  /**
   * Initialize the storage file if it doesn't exist
   */
  private async ensureStorageExists(): Promise<void> {
    try {
      // Check if file exists
      await fs.access(this.filePath);
    } catch (error) {
      // File doesn't exist, create it with empty users array
      try {
        // Ensure directory exists first
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        
        const initialData: UserData = { users: [] };
        await fs.writeFile(this.filePath, JSON.stringify(initialData, null, 2));
      } catch (initError) {
        throw new Error(`Failed to initialize user storage: ${initError}`);
      }
    }
  }

  /**
   * Read all users from storage
   */
  async getAllUsers(): Promise<User[]> {
    try {
      await this.ensureStorageExists();
      
      const data = await fs.readFile(this.filePath, 'utf-8');
      const userData: UserData = JSON.parse(data);
      
      return userData.users || [];
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Corrupted user data file');
      }
      throw new Error(`Failed to read users: ${error}`);
    }
  }

  /**
   * Find a user by email
   */
  async findUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.getAllUsers();
    return users.find(user => user.email === email);
  }

  /**
   * Find a user by ID
   */
  async findUserById(id: string): Promise<User | undefined> {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id);
  }

  /**
   * Add a new user to storage
   */
  async addUser(user: User): Promise<void> {
    try {
      const users = await this.getAllUsers();
      
      // Check if user already exists
      if (users.some(existingUser => existingUser.email === user.email)) {
        throw new Error('User already exists');
      }
      
      users.push(user);
      await this.saveUsers(users);
    } catch (error) {
      if (error instanceof Error && error.message === 'User already exists') {
        throw error; // Re-throw as is for specific handling
      }
      throw new Error(`Failed to add user: ${error}`);
    }
  }

  /**
   * Save users array to storage
   */
  private async saveUsers(users: User[]): Promise<void> {
    try {
      await this.ensureStorageExists();
      
      const userData: UserData = { users };
      await fs.writeFile(this.filePath, JSON.stringify(userData, null, 2));
    } catch (error) {
      throw new Error(`Failed to save users: ${error}`);
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User | null> {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(user => user.id === id);
      
      if (userIndex === -1 || !users[userIndex]) {
        return null;
      }
      
      const existingUser = users[userIndex];
      // Ensure we maintain the complete User object
      users[userIndex] = {
        id: existingUser.id,
        email: updates.email ?? existingUser.email,
        password: updates.password ?? existingUser.password,
      };
      await this.saveUsers(users);
      
      return users[userIndex] ?? null;
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  /**
   * Delete a user by ID
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers();
      const filteredUsers = users.filter(user => user.id !== id);
      
      if (filteredUsers.length === users.length) {
        return false; // User not found
      }
      
      await this.saveUsers(filteredUsers);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error}`);
    }
  }
}

// Export a singleton instance
export const userStorage = new UserStorage();