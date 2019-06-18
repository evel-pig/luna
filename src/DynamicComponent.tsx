import * as React from 'react';
import { loadModels } from './dynamic';
import connect from './connect';

let defaultLoadingComponent = () => null;

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

export default class DynamicComponent<T extends DynamicComponentProps> extends React.Component<T, any> {
  static defaultProps = {
    connectModel: true,
  };
  static setDefaultLoadingComponent = (LoadingComponent) => {
    defaultLoadingComponent = LoadingComponent;
  }

  LoadingComponent: any;
  mounted: boolean;
  models: any;

  constructor(props) {
    super(props);

    this.LoadingComponent = defaultLoadingComponent;
    this.mounted = false;

    this.state = {
      AsyncComponent: null,
    };

    this.models = {};

    this.load();
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentDidUpdate() {
    if (module.hot && window['hotReload']) {
      setImmediate(() => {
        this.load();
        window['hotReload'] = false;
      });
    }

    return null;
  }

  load() {
    this.loadModels().then(() => {
      this.loadComponent();
    });
  }

  loadModels() {
    return new Promise(resolve => {
      loadModels((this.props.model.models || [])).then((models: any) => {
        this.models = models;
        resolve();
      });
    });
  }

  loadComponent() {
    // 判断是不是动态加载的组件
    const component = this.props.model.component;
    if (component.toString().indexOf('.then(') < 0) {
      this.setAsyncComponent(component);
      return;
    }
    component().then(r => {
      let c = r;
      if (r.default) {
        c = r.default;
      }
      this.setAsyncComponent(c);
    }).catch(err => {
      console.log(err);
    });
  }

  setAsyncComponent = (AsyncComponent) => {
    if (this.mounted) {
      let connectModel = this.props.connectModel;
      if ((this.props.model.models || []).length === 0) {
        connectModel = false;
      }
      this.setState({
        AsyncComponent: connectModel ? connect(this.models)(AsyncComponent) : AsyncComponent,
      });
    }
  }

  render() {
    const { AsyncComponent } = this.state;
    if (AsyncComponent) {
      const { model, connectModel, ...rest } = this.props;
      return (
        <AsyncComponent {...rest} />
      );
    }

    const { LoadingComponent } = this;
    return <LoadingComponent />;
  }
}
