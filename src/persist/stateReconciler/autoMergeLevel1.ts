export default function autoMergeLevel1(inboundState, originalState, reducedState) {
  let newState = { ...reducedState };
  if (inboundState && typeof inboundState === 'object') {
    Object.keys(inboundState).forEach(key => {
      if (originalState[key] !== reducedState[key]) {
        if (process.env.NODE_ENV !== 'production') {
          return;
        }
      }
      newState[key] = inboundState[key];
    });
  }

  return newState;
}
