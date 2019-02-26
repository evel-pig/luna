export default function autoMergeLevel2(inboundState, originalState, reducedState) {
  let newState = { ...reducedState };
  if (inboundState && typeof inboundState === 'object') {
    Object.keys(inboundState).forEach(key => {
      if (originalState[key] !== reducedState[key]) {
        if (process.env.NODE_ENV !== 'production') {
          return;
        }
      }

      if (isPlainEnoughObject(reducedState[key])) {
        // if object is plain enough shallow merge the new values (hence "Level2")
        newState[key] = { ...newState[key], ...inboundState[key] };
        return;
      }

      newState[key] = inboundState[key];
    });
  }

  return newState;
}

function isPlainEnoughObject(o) {
  return o !== null && !Array.isArray(o) && typeof o === 'object';
}
