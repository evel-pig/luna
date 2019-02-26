export function loadComponents(route) {
  let dynamicComponents = {};
  let notDynamicComponents = {};
  Object.keys(route.components).forEach(item => {
    const component = route.components[item];
    if (component.toString().indexOf('.then(') < 0) {
      dynamicComponents[item] = component;
    } else {
      notDynamicComponents[item] = getDefault(component);
    }
  });
  const dynamicComponentKeys = Object.keys(dynamicComponents);
  const dynamicComponentValues = dynamicComponentKeys.map(item => dynamicComponents[item]);
  return new Promise((resolve) => {
    Promise.all(dynamicComponentValues).then((ret) => {
      const lcs = {};
      ret.forEach((item, index) => {
        let loadComponent = getDefault(item);
        lcs[dynamicComponentKeys[index]] = loadComponent;
      });
      resolve({
        ...lcs,
        ...notDynamicComponents,
      });
    }).catch(err => {
      console.log(err);
    });
  });
}

export function loadModels(models) {
  let dynamicModels = [];
  let notDynamicModels = [];
  models.forEach(model => {
    if (model.toString().indexOf('.then(') < 0) {
      notDynamicModels.push(model);
    } else {
      dynamicModels.push(model());
    }
  });
  let loadedModels = {};
  return new Promise((resolve) => {
    notDynamicModels.map(item => {
      item = getDefault(item);
      if (item.modelName) {
        loadedModels[item.modelName] = item;
      }
    });
    Promise.all(dynamicModels).then((ret) => {
      ret.forEach((item, index) => {
        item = getDefault(item);
        if (item.modelName) {
          loadedModels[item.modelName] = item;
        }
      });
      resolve(loadedModels);
    }).catch(err => {
      console.log(err);
    });
  });
}

function getDefault(value) {
  if (value.default) {
    return value.default;
  }

  return value;
}
