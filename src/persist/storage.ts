function setState(key, state) {
  localStorage.setItem(key, state);
}

function getState(key) {
  return JSON.parse(localStorage.getItem(key));
}

export default {
  setState,
  getState,
};
