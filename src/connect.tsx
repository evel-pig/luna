import * as React from 'react';
import { connect as rrConnect } from 'react-redux';

export interface NormalComponentProps {
  dispatch: any;
}

export default function connect<OwnProps = any>(mapStateToProps) {
  return function(Component) {
    const reducers = {};
    const sagas = {};
    const newPropState = {};
    const injectActions = {};
    const propState = mapStateToProps || {};
    Object.keys(propState).forEach(propsName => {
      let t = propState[propsName];
      if (typeof t === 'object') {
        if (t.default) {
          t = {
            ...t.default,
            modelName: t.default.modelName || t.modelName,
          };
        }
        reducers[t.modelName] = t.reducer;
        sagas[t.modelName] = t.sagas;
        newPropState[propsName] = t.modelName;
        injectActions[`${propsName}Actions`] = t.actions || {};
      } else {
        newPropState[propsName] = t;
      }
    });
    if (window['inejctAppModel']) {
      window['inejctAppModel'](reducers, sagas);
    }
    const mapState2Props = state => {
      let props = {};
      if (newPropState) {
        Object.keys(newPropState).forEach(propsName => {
          props = {
            ...props,
            ...{
              [propsName]: state[newPropState[propsName]],
            },
            ...injectActions,
          };
        });
      }
      return props;
    };

    return rrConnect(mapState2Props, null, null, { withRef: true })(Component) as React.ComponentClass<OwnProps>;
  };
}