import React from 'react';
import { List, ListItem, ListItemText, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// A simple type for the user, assuming it has at least id, name, and email.
// In a real app, this would be imported from a shared types package.
interface User {
  id: string;
  name?: string;
  email?: string;
}

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete }) => {
  return (
    <List>
      {users.map((user) => (
        <ListItem
          key={user.id}
          secondaryAction={
            <>
              <IconButton edge="end" aria-label="edit" onClick={() => onEdit(user)}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={() => onDelete(user.id)}>
                <DeleteIcon />
              </IconButton>
            </>
          }
        >
          <ListItemText
            primary={user.name || 'Unnamed User'}
            secondary={user.email || user.id}
          />
        </ListItem>
      ))}
    </List>
  );
};
