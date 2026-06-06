import { ref } from 'vue';
import { checkAuthStatus, clearToken, getToken, login as apiLogin, setToken } from '../api/auth';

const isLoggedIn = ref(false);
const username = ref<string | null>(null);
const loginModalOpen = ref(false);

export function useAuth() {
  async function initAuth() {
    const token = getToken();
    if (!token) return;

    try {
      const result = await checkAuthStatus();
      isLoggedIn.value = true;
      username.value = result.username;
    } catch {
      clearToken();
    }
  }

  async function login(password: string) {
    const result = await apiLogin(password);
    setToken(result.token);
    isLoggedIn.value = true;
    username.value = result.username;
  }

  function logout() {
    clearToken();
    isLoggedIn.value = false;
    username.value = null;
  }

  function openLoginModal() {
    loginModalOpen.value = true;
  }

  function closeLoginModal() {
    loginModalOpen.value = false;
  }

  function getAuthHeaders(): Record<string, string> {
    const token = getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  return {
    isLoggedIn,
    username,
    loginModalOpen,
    initAuth,
    login,
    logout,
    openLoginModal,
    closeLoginModal,
    getAuthHeaders
  };
}
