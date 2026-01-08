import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Group, PanicAlert, AppSettings } from '../types';
import { authAPI, usersAPI, groupsAPI, panicAPI, settingsAPI, adminAPI } from '../utils/api';
import { socketService } from '../utils/socket';
import { pushService } from '../utils/push';

interface AppState {
  // Auth
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Current user (logged in user)
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Group data
  group: Group | null;
  setGroup: (group: Group | null) => void;

  // Users in group
  users: User[];
  setUsers: (users: User[]) => void;
  updateUserLocation: (userId: string, lat: number, lng: number) => void;
  updateUserAvatar: (userId: string, avatar: string) => void;
  setUserPanic: (userId: string, isPanic: boolean) => void;

  // Panic alerts
  panicAlerts: PanicAlert[];
  setPanicAlerts: (alerts: PanicAlert[]) => void;
  addPanicAlert: (alert: PanicAlert) => void;
  resolvePanicAlert: (alertId: string) => void;

  // Settings
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // App activation status
  checkAppActivation: () => boolean;

  // API Actions
  login: (phone: string, password: string) => Promise<boolean>;
  loginWithQR: (qrToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchGroup: () => Promise<void>;
  fetchPanicAlerts: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  sendLocation: (lat: number, lng: number) => Promise<void>;
  triggerPanic: (message: string, lat: number, lng: number) => Promise<PanicAlert | null>;
  resolveAlert: (alertId: string, userId: string) => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  joinGroup: (joinCode: string) => Promise<{ success: boolean; message: string }>;
  leaveGroup: () => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (avatar: string) => Promise<{ success: boolean; message: string }>;

  // Initialize
  initApp: () => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      group: null,
      setGroup: (group) => set({ group }),

      users: [],
      setUsers: (users) => set({ users }),

      updateUserLocation: (userId, lat, lng) => set((state) => ({
        users: state.users.map((u) =>
          String(u.id) === String(userId)
            ? { ...u, location: { lat, lng, timestamp: Date.now() }, isOnline: true }
            : u
        ),
      })),

      updateUserAvatar: (userId, avatar) => set((state) => ({
        users: state.users.map((u) =>
          String(u.id) === String(userId) ? { ...u, avatar } : u
        ),
        currentUser: state.currentUser && String(state.currentUser.id) === String(userId)
          ? { ...state.currentUser, avatar }
          : state.currentUser
      })),

      setUserPanic: (userId, isPanic) => set((state) => ({
        users: state.users.map((u) =>
          String(u.id) === String(userId) ? { ...u, isPanic } : u
        ),
      })),

      panicAlerts: [],
      setPanicAlerts: (alerts) => set({ panicAlerts: alerts }),

      addPanicAlert: (alert) => set((state) => {
        // Check if alert already exists to prevent duplicates
        const exists = state.panicAlerts.some(a => a.id === alert.id);
        if (exists) return state;
        return {
          panicAlerts: [alert, ...state.panicAlerts],
        };
      }),

      resolvePanicAlert: (alertId) => set((state) => ({
        panicAlerts: state.panicAlerts.map((a) =>
          a.id === alertId ? { ...a, isResolved: true } : a
        ),
      })),

      settings: {
        isGpsActive: true,
        trackingInterval: 60, // Default to 1 minute for better battery
        radiusLimit: 500,
        isAppActive: true,
      },

      setSettings: (settings) => set({ settings }),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

      checkAppActivation: () => {
        const { group, settings } = get();
        if (!group) return false;

        const now = new Date();
        const departure = new Date(group.departureDate);
        const returnDate = new Date(group.returnDate);

        const isWithinTravelPeriod = now >= departure && now <= returnDate;
        return settings.isAppActive && isWithinTravelPeriod;
      },

      clearError: () => set({ error: null }),

      // API Actions
      login: async (phone, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(phone, password);
          const { token, user } = response.data;

          localStorage.setItem('token', token);

          set({
            token,
            isAuthenticated: true,
            currentUser: user,
            isLoading: false,
          });

          // Connect socket
          socketService.connect();

          // Fetch initial data immediately after login
          await Promise.all([
            get().fetchCurrentUser(),
            get().fetchGroup(),
            get().fetchUsers(),
            get().fetchPanicAlerts(),
            get().fetchSettings()
          ]);

          return true;
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          set({
            error: err.response?.data?.message || 'Login gagal',
            isLoading: false,
          });
          return false;
        }
      },

      loginWithQR: async (qrToken) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.loginQR(qrToken);
          const { token, user } = response.data;

          localStorage.setItem('token', token);

          set({
            token,
            isAuthenticated: true,
            currentUser: user,
            isLoading: false,
          });

          // Connect socket
          socketService.connect();

          // Fetch initial data immediately after login
          await Promise.all([
            get().fetchCurrentUser(),
            get().fetchGroup(),
            get().fetchUsers(),
            get().fetchPanicAlerts(),
            get().fetchSettings()
          ]);

          return true;
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          set({
            error: err.response?.data?.message || 'QR Code tidak valid',
            isLoading: false,
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch {
          // Ignore error
        }
        localStorage.removeItem('token');
        socketService.disconnect();
        set({
          token: null,
          isAuthenticated: false,
          currentUser: null,
          group: null,
          users: [],
          panicAlerts: [],
        });
      },

      fetchCurrentUser: async () => {
        try {
          const response = await authAPI.me();
          set({ currentUser: response.data, isAuthenticated: true });
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          throw error; // Rethrow so initApp can handle critical failure
        }
      },

      fetchUsers: async () => {
        try {
          const { currentUser } = get();
          const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

          const response = isAdmin
            ? await adminAPI.getUsers()
            : await usersAPI.getAll();

          set({ users: response.data });
        } catch (error) {
          console.error('Failed to fetch users:', error);
          // Non-critical, but we could throw if we want strictness
        }
      },

      fetchGroup: async () => {
        try {
          const response = await groupsAPI.getCurrent();
          set({
            group: response.data
          });
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.log('User not in any group yet');
          } else {
            console.error('Failed to fetch group:', error);
          }
          set({ group: null }); // Clear group if fetch fails or 404
        }
      },

      fetchPanicAlerts: async () => {
        try {
          const response = await panicAPI.getAll();
          set({ panicAlerts: response.data });
        } catch (error) {
          console.error('Failed to fetch panic alerts:', error);
        }
      },

      fetchSettings: async () => {
        try {
          const response = await settingsAPI.get();
          set({ settings: response.data });
        } catch (error) {
          console.error('Failed to fetch settings:', error);
        }
      },

      sendLocation: async (lat, lng) => {
        const { currentUser } = get();
        try {
          await usersAPI.updateLocation(lat, lng);

          // Update local state
          if (currentUser) {
            get().updateUserLocation(currentUser.id, lat, lng);

            // Broadcast via socket
            socketService.sendLocationUpdate(lat, lng);
          }
        } catch (error) {
          console.error('Failed to send location:', error);
        }
      },

      triggerPanic: async (message, lat, lng) => {
        try {
          const response = await panicAPI.create(message, lat, lng);
          const alert = response.data;

          get().addPanicAlert(alert);
          get().setUserPanic(alert.userId, true);

          // Broadcast via socket
          socketService.sendPanicAlert(alert);

          return alert;
        } catch (error) {
          console.error('Failed to trigger panic:', error);
          return null;
        }
      },

      resolveAlert: async (alertId, userId) => {
        try {
          await panicAPI.resolve(alertId);

          get().resolvePanicAlert(alertId);
          get().setUserPanic(userId, false);

          // Broadcast via socket
          socketService.sendPanicResolved(alertId);
        } catch (error) {
          console.error('Failed to resolve alert:', error);
        }
      },

      saveSettings: async (newSettings) => {
        try {
          await settingsAPI.update(newSettings);
          get().updateSettings(newSettings);
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      },

      joinGroup: async (joinCode) => {
        try {
          const response = await groupsAPI.join(joinCode);
          const { group, token } = response.data;

          // Save new token with updated groupId
          if (token) {
            localStorage.setItem('token', token);
            set({ token });
          }

          // Update current user's groupId
          const currentUser = get().currentUser;
          if (currentUser) {
            set({ currentUser: { ...currentUser, groupId: group.id } });
          }

          // Refresh all group-related data
          await get().fetchGroup();
          await get().fetchUsers();
          await get().fetchPanicAlerts();
          await get().fetchSettings();

          // Reconnect socket to join new group room
          socketService.disconnect();
          socketService.connect();

          return { success: true, message: response.data.message };
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          return { success: false, message: err.response?.data?.message || 'Gagal bergabung ke grup' };
        }
      },

      leaveGroup: async () => {
        try {
          const response = await groupsAPI.leave();
          const { token } = response.data;

          // Save new token with null groupId
          if (token) {
            localStorage.setItem('token', token);
            set({ token });
          }

          // Update current user's groupId
          const currentUser = get().currentUser;
          if (currentUser) {
            set({ currentUser: { ...currentUser, groupId: undefined } });
          }

          // Clear group data
          set({ group: null, users: [], panicAlerts: [] });

          // Disconnect and reconnect to refresh socket rooms (remove old group room)
          socketService.disconnect();
          socketService.connect();

          return { success: true, message: 'Berhasil keluar dari grup' };
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          return { success: false, message: err.response?.data?.message || 'Gagal keluar dari grup' };
        }
      },

      updateUserProfile: async (avatar) => {
        try {
          await usersAPI.updateProfile(avatar);

          set((state) => {
            const updatedCurrentUser = state.currentUser ? { ...state.currentUser, avatar } : null;
            const updatedUsers = state.users.map(u =>
              state.currentUser && u.id === state.currentUser.id ? { ...u, avatar } : u
            );

            return {
              currentUser: updatedCurrentUser,
              users: updatedUsers
            };
          });

          return { success: true, message: 'Foto profil berhasil diperbarui' };
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          return { success: false, message: err.response?.data?.message || 'Gagal update foto profil' };
        }
      },

      initApp: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false, isLoading: false, token: null, currentUser: null });
          return;
        }

        set({ token, isLoading: true });

        try {
          // 1. MUST fetch profile first to get groupId/role context
          await get().fetchCurrentUser();

          // 2. Now fetch the rest knowing the context
          await Promise.all([
            get().fetchGroup(),
            get().fetchUsers(),
            get().fetchPanicAlerts(),
            get().fetchSettings()
          ]);

          // 3. Connect socket
          socketService.connect();

          // Setup socket listeners
          socketService.onUserLocationUpdated((data) => {
            get().updateUserLocation(data.userId, data.location.lat, data.location.lng);
          });

          socketService.onUserProfileUpdated((data) => {
            get().updateUserAvatar(data.userId, data.avatar);
          });

          socketService.onNewPanicAlert((alert) => {
            get().addPanicAlert(alert as PanicAlert);
            const panicAlert = alert as PanicAlert;
            get().setUserPanic(panicAlert.userId, true);
          });

          socketService.onPanicResolved((data) => {
            get().resolvePanicAlert(data.alertId);
            get().setUserPanic(data.userId, false);
          });

          // 4. Subscribe to push notifications (async, don't wait)
          pushService.subscribe().then(subscribed => {
            if (subscribed) {
              console.log('✅ Push notifications enabled');
            } else {
              console.log('⚠️ Push notifications not enabled (permission denied or not supported)');
            }
          }).catch(err => {
            console.error('Push subscription error:', err);
          });

          set({ isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          console.error('CRITICAL: Failed to init app:', error);

          // Only logout if it's strictly a 401 Unauthorized error from the backend
          // Don't logout on network errors, timeout, or 500s
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            set({
              isAuthenticated: false,
              token: null,
              currentUser: null,
              group: null,
              users: [],
              isLoading: false
            });
          } else {
            // For other errors, just stop loading but keep the token
            // This allows the user to try refreshing again without logging in
            set({
              isLoading: false,
              error: 'Gagal memuat data. Periksa koneksi internet Anda.'
            });
          }
        }
      },
    }),
    {
      name: 'itj-travel-storage',
      partialize: (state) => ({
        token: state.token,
        settings: state.settings,
      }),
    }
  )
);
