import * as React from 'react';
import { loadModels as loadModelsCore } from './dynamic';
import connect from './connect';

let DefaultLoadingComponent = () => null;

declare const module: any;

export interface DynamicComponentModel {
  models?: any[];
  component: any;
}

export interface DynamicComponentProps {
  model: DynamicComponentModel;
  /**
   * 是否注入model，默认为true
   */
  connectModel?: boolean;
}

export default function DynamicComponent<T extends DynamicComponentProps>(props: T) {
  const [ AsyncComponent, setAsyncComponent ] = React.useState(null);
  let models = {};
  const mounted = React.useRef(false);

  function load() {
    loadModels().then(() => {
      loadComponent();
    });
  }

  function loadModels() {
    return new Promise(resolve => {
      loadModelsCore((props.model.models || [])).then((data: any) => {
        models = data;
        resolve();
      });
    });
  }

  function loadComponent() {
    // 判断是不是动态加载的组件
    const component = props.model.component;
    if (component.toString().indexOf('.then(') < 0) {
      setComponent(component);
      return;
    }
    component().then(r => {
      let c = r;
      if (r.default) {
        c = r.default;
      }
      setComponent(c);
    }).catch(err => {
      console.log(err);
    });
  }

  function setComponent(component) {
    if (mounted.current) {
      let connectModel = props.connectModel;
      if ((props.model.models || []).length === 0) {
        connectModel = false;
      }
      setAsyncComponent(() => {
        return connectModel ? connect(models)(component) : component;
      });
    }
  }

  React.useEffect(() => {
    load();
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (module.hot && window['hotReload']) {
      setImmediate(() => {
        load();
        window['hotReload'] = false;
      });
    }
  });

  if (AsyncComponent) {
    const { model, connectModel, ...rest } = props;
    return (
      <AsyncComponent {...rest} />
    );
  }

  return <DefaultLoadingComponent />;
}

export const setDefaultLoadingComponent = (LoadingComponent) => {
  DefaultLoadingComponent = LoadingComponent;
};
