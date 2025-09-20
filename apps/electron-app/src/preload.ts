import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getUsers: () => ipcRenderer.invoke('get-users'),
  createUser: (data) => ipcRenderer.invoke('create-user', data),
  updateUser: (id, data) => ipcRenderer.invoke('update-user', { id, data }),
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id),
});
