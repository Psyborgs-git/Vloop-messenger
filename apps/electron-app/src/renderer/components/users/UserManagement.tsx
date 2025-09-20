import React, { useState, useEffect } from 'react';
import { Button, Typography, Box } from '@mui/material';
import { UserList } from './UserList';
import { UserForm } from './UserForm';

// A simple type for the user.
interface User {
  id: string;
  name?: string;
  email?: string;
}

// Assuming a global electronAPI object from the preload script
declare global {
  interface Window {
    electronAPI: {
      getUsers: () => Promise<User[]>;
      createUser: (data: Partial<User>) => Promise<User>;
      updateUser: (id: string, data: Partial<User>) => Promise<User>;
      deleteUser: (id: string) => Promise<User>;
    };
  }
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await window.electronAPI.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFormOpen = (user: User | null = null) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const handleFormSubmit = async (data: Partial<User>) => {
    try {
      if (editingUser) {
        await window.electronAPI.updateUser(editingUser.id, data);
      } else {
        await window.electronAPI.createUser(data);
      }
      fetchUsers(); // Refetch users after create/update
    } catch (error) {
      console.error("Failed to submit user form:", error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await window.electronAPI.deleteUser(id);
      fetchUsers(); // Refetch users after delete
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">User Management</Typography>
        <Button variant="contained" onClick={() => handleFormOpen()}>
          Add User
        </Button>
      </Box>
      <UserList users={users} onEdit={handleFormOpen} onDelete={handleDeleteUser} />
      <UserForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingUser}
      />
    </Box>
  );
};
