import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

// Initialize localforage store
localforage.config({
  name: 'Glide',
  storeName: 'trusted_devices',
  description: 'Stores trusted devices for quick reconnection'
});

export const getMyDevice = async () => {
  let myDevice = await localforage.getItem('my_device');
  if (!myDevice) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const os = navigator.userAgent.includes('Mac') ? 'Mac' : navigator.userAgent.includes('Win') ? 'Windows' : 'Device';
    myDevice = {
      id: uuidv4(),
      name: `${isMobile ? 'Mobile' : os} User ${Math.floor(1000 + Math.random() * 9000)}`
    };
    await localforage.setItem('my_device', myDevice);
  }
  return myDevice;
};

export const setMyDeviceName = async (name) => {
  let myDevice = await getMyDevice();
  myDevice.name = name;
  await localforage.setItem('my_device', myDevice);
  return myDevice;
};

export const getTrustedDevices = async () => {
  const devices = await localforage.getItem('trusted_devices_list');
  return devices || [];
};

export const addTrustedDevice = async (device) => {
  let devices = await getTrustedDevices();
  const existingIndex = devices.findIndex(d => d.id === device.id);
  
  if (existingIndex !== -1) {
    devices[existingIndex] = { ...devices[existingIndex], ...device, lastSeen: Date.now() };
  } else {
    devices.push({ ...device, lastSeen: Date.now() });
  }
  
  await localforage.setItem('trusted_devices_list', devices);
  return devices;
};

export const removeTrustedDevice = async (deviceId) => {
  let devices = await getTrustedDevices();
  devices = devices.filter(d => d.id !== deviceId);
  await localforage.setItem('trusted_devices_list', devices);
  return devices;
};
