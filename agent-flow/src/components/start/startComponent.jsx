/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import StartFormWrapper from "./StartFormWrapper.jsx";
import {v4 as uuidv4} from "uuid";

export const startComponent = (jadeConfig) => {
  const self = {};

  /**
   * 必须.
   */
  self.getJadeConfig = () => {
    return jadeConfig ? jadeConfig : [
      {
        id: uuidv4(),
        name: "input",
        type: "Object",
        from: "Expand",
        value: [{
          id: `input_${uuidv4()}`,
          name: 'Question',
          type: 'String',
          from: 'Input',
          value: '',
          disableModifiable: true,
          isRequired: true,
          isVisible: true,
          displayName: '用户问题',
        }],
      },
      // memory 配置已删除
    ];
  };

  /**
   * 必须.
   */
  self.getReactComponents = (shapeStatus, data) => {
    return (<>
      <StartFormWrapper data={data} shapeStatus={shapeStatus}/>
    </>);
  };

  /**
   * 必须.
   */
  self.reducers = (data, action) => {
    const addInputParam = () => {
      return data.map(item => {
        if (item.name === "input") {
          return {
            ...item,
            value: [
              ...item.value,
              {
                id: action.id,
                name: "",
                type: "String",
                from: "Input",
                description: "",
                value: "",
                disableModifiable: false,
                isRequired: true,
                isVisible: true,
                displayName: '',
              }
            ]
          }
        } else {
          return item;
        }
      })
    };

    const addParam = () => {
      let param = action.value;
      return data.map(item => {
        if (item.name === "input") {
          return {
            ...item,
            value: [
              ...item.value,
              {
                id: param.id,
                name: param.name,
                type: param.type,
                from: "Input",
                description: param.description,
                value: param.value,
                disableModifiable: param.disableModifiable,
                isRequired: param.isRequired,
                isVisible: param.isVisible,
                displayName: param.displayName,
                appearance: param.appearance,
              }
            ]
          }
        } else {
          return item;
        }
      })
    };

    const updateInputParamById = () => {
      const param = action.value;
      return data.map(item => {
        if (item.name === "input") {
          return {
            ...item,
            value: item.value.map(p => {
              if (p.id === action.id) {
                return {
                  ...p,
                  ...param,
                };
              } else {
                return p;
              }
            })
          };
        } else {
          return item;
        }
      });
    };

    const changeInputParam = () => {
      return data.map(item => {
        if (item.name === "input") {
          return {
            ...item, value: item.value.map(inputItem => {
              if (inputItem.id === action.id) {
                return {
                  ...inputItem, [action.type]: action.value
                }
              } else {
                return inputItem;
              }
            })
          }
        } else {
          return item;
        }
      });
    };

    // changeMemorySwitch 和 changeMemory 函数已删除

    const deleteInputParam = () => {
      return data.map(item => {
        if (item.name === "input") {
          return {
            ...item, value: item.value.filter(inputItem => inputItem.id !== action.id)
          }
        } else {
          return item;
        }
      });
    };

    const changeAppConfig = () => {
      return data.map(item => {
        if (item.name === 'appConfig') {
          return {
            ...item, value: item.value.map(configItem => {
              if (configItem.name === action.name) {
                return {...configItem, value: action.value};
              } else {
                return configItem;
              }
            }),
          };
        } else {
          return item;
        }
      });
    };

    switch (action.actionType) {
      case 'addInputParam': {
        return addInputParam();
      }
      case 'changeInputParam': {
        return changeInputParam();
      }
      case 'addParam': {
        return addParam();
      }
      case 'editParam': {
        return updateInputParamById();
      }
      // changeMemory 和 changeMemorySwitch case 已删除
      case 'deleteInputParam': {
        return deleteInputParam();
      }
      case 'changeAppConfig': {
        return changeAppConfig();
      }
      case 'changeFlowMeta': {
        return {
          ...data,
          enableStageDesc: action.data.enableStageDesc,
          stageDesc: action.data.stageDesc,
        };
      }
      default: {
        throw Error('Unknown action: ' + action.type);
      }
    }
  };

  return self;
};