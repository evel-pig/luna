import * as React from 'react';

let defaultLoadingComponent = () => null;

export interface PersistWrapperProps {
  persistor: any;
}

interface MyState {
  initialize: boolean;
}

export default class PersistWrapper extends React.Component<PersistWrapperProps, Partial<MyState>> {
  static setDefaultLoadingComponent = (LoadingComponent) => {
    defaultLoadingComponent = LoadingComponent;
  }

  LoadingComponent: any;

  _unsubscribe: any;

  constructor(props) {
    super(props);

    this.state = {
      initialize: props.persistor ? false : true,
    };

    this.LoadingComponent = defaultLoadingComponent;
  }

  componentDidMount() {
    if (this.props.persistor) {
      this._unsubscribe = this.props.persistor.subscribe(
        this.handlePersistorState,
      );
      this.handlePersistorState();
    }
  }

  handlePersistorState = () => {
    const { persistor } = this.props;
    let { initialize } = persistor.getState();
    if (initialize) {
      this.setState({ initialize: true });
      if (this._unsubscribe) {
        this._unsubscribe();
      }
    }
  }

  componentWillUnmount() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
  }

  render() {
    const { LoadingComponent } = this;
    return this.state.initialize ? this.props.children : <LoadingComponent />;
  }
}
