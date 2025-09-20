import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // The `__dirname` will be `.../apps/electron-app/dist` at runtime.
  const indexPath = path.join(__dirname, 'index.html');
  mainWindow.loadFile(indexPath);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

app.on('ready', () => {
  createWindow();

  ipcMain.handle('get-users', async () => {
    return await prisma.user.findMany();
  });

  ipcMain.handle('create-user', async (event, data) => {
    // In a real implementation, this would be the flow:
    // 1. Send mutation to GraphQL API
    // const remoteUser = await graphqlClient.mutate({ mutation: CREATE_USER_MUTATION, variables: { input: data } });
    // 2. On success, store the result in the local DB
    //    The data for the local create should come from the API response to ensure consistency.
    // const localUser = await prisma.user.create({ data: remoteUser.data.createUser });
    // return localUser;

    // Placeholder logic (writes directly to local DB for now):
    return await prisma.user.create({ data });
  });

  ipcMain.handle('update-user', async (event, { id, data }) => {
    // 1. Send mutation to GraphQL API
    // await graphqlClient.mutate({ mutation: UPDATE_USER_MUTATION, variables: { id, input: data } });

    // 2. On success, update the local DB
    return await prisma.user.update({ where: { id }, data });
  });

  ipcMain.handle('delete-user', async (event, id) => {
    // 1. Send mutation to GraphQL API
    // await graphqlClient.mutate({ mutation: DELETE_USER_MUTATION, variables: { id } });

    // 2. On success, delete from the local DB
    return await prisma.user.delete({ where: { id } });
  });
});

app.on('window-all-closed', async () => {
  await prisma.$disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
