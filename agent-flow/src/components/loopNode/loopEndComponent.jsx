/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {v4 as uuidv4} from 'uuid';
import {defaultComponent} from '@/components/defaultComponent.js';
import {UpdateInputReducer} from '@/components/end/reducers/reducers.js';
import {LoopEndInputForm} from '@/components/loopNode/LoopEndInputForm.jsx';
import {FLOW_TYPE} from '@/common/Consts.js';
import {getDefaultReference} from '@/components/util/ReferenceUtil.js';
import {useConfigContext} from '@/components/DefaultRoot.jsx';
import FlagIcon from "../asserts/icon-flag.svg?react";

const LoopEndNodeView = ({shapeStatus, data}) => {
    const isConfig = useConfigContext();
    if (isConfig) {
        return (<LoopEndInputForm shapeStatus={shapeStatus} data={data}/>);
    }
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            minHeight: '36px',
            transform: 'translateY(-4px)'
        }}>
            <FlagIcon style={{width: '28px', height: '28px', color: '#047bfc'}}/>
        </div>
    );
};

/**
 * 循环结束节点组件
 * 禁止输出结果到对话，只允许选择输出变量
 *
 * @param jadeConfig
 * @param shape 图形对象.
 */
export const loopEndComponent = (jadeConfig, shape) => {
    const self = defaultComponent(jadeConfig);
    const addReducer = (map, reducer) => map.set(reducer.type, reducer);
    const builtInReducers = new Map();
    addReducer(builtInReducers, UpdateInputReducer(shape, self));

  const ensureStateWrapper = (config) => {
    const newConfig = {...config};
    const inputParams = Array.isArray(newConfig.inputParams) ? [...newConfig.inputParams] : [];
    const finalOutputIndex = inputParams.findIndex(item => item?.name === 'finalOutput');
    if (finalOutputIndex === -1) {
      return newConfig;
    }

    const finalOutput = {...inputParams[finalOutputIndex]};
    const currentValue = Array.isArray(finalOutput.value) ? [...finalOutput.value] : [];
    let stateNode = currentValue.find(item => item?.name === 'state' && item?.type === 'Object');

    if (!stateNode) {
      stateNode = {
        id: uuidv4(),
        name: 'state',
        type: 'Object',
        from: 'Expand',
        value: currentValue,
      };
      finalOutput.value = [stateNode];
      finalOutput.type = 'Object';
      finalOutput.from = 'Expand';
    } else if (!Array.isArray(stateNode.value)) {
      stateNode = {...stateNode, value: []};
      finalOutput.value = currentValue.map(item => (item?.id === stateNode.id ? stateNode : item));
    }

    inputParams[finalOutputIndex] = finalOutput;
    newConfig.inputParams = inputParams;
    return newConfig;
  };

  const addLoopEndInputReducer = () => {
    const reducer = {};
    reducer.type = 'addInput';
    reducer.reduce = (config) => {
      const newConfig = ensureStateWrapper({...config});
      const finalOutputIndex = newConfig.inputParams.findIndex(item => item?.name === 'finalOutput');
      if (finalOutputIndex === -1) {
        return newConfig;
      }

      const finalOutput = {...newConfig.inputParams[finalOutputIndex]};
      const stateNode = Array.isArray(finalOutput.value)
        ? finalOutput.value.find(item => item?.name === 'state' && item?.type === 'Object')
        : null;
      if (!stateNode) {
        return newConfig;
      }

      const newRefInput = getDefaultReference(uuidv4());
      newRefInput.isRequired = true;
      const newStateNode = {
        ...stateNode,
        value: Array.isArray(stateNode.value) ? [...stateNode.value, newRefInput] : [newRefInput],
      };
      finalOutput.value = finalOutput.value.map(item => (item?.id === stateNode.id ? newStateNode : item));
      newConfig.inputParams[finalOutputIndex] = finalOutput;
      return newConfig;
    };
    return reducer;
  };

  const deleteLoopEndInputReducer = () => {
    const reducer = {};
    reducer.type = 'deleteInput';
    reducer.reduce = (config, action) => {
      const newConfig = ensureStateWrapper({...config});
      const finalOutputIndex = newConfig.inputParams.findIndex(item => item?.name === 'finalOutput');
      if (finalOutputIndex === -1) {
        return newConfig;
      }

      const finalOutput = {...newConfig.inputParams[finalOutputIndex]};
      const stateNode = Array.isArray(finalOutput.value)
        ? finalOutput.value.find(item => item?.name === 'state' && item?.type === 'Object')
        : null;
      if (!stateNode) {
        return newConfig;
      }

      const newStateNode = {
        ...stateNode,
        value: Array.isArray(stateNode.value)
          ? stateNode.value.filter(item => item?.id !== action.id)
          : [],
      };
      finalOutput.value = finalOutput.value.map(item => (item?.id === stateNode.id ? newStateNode : item));
      newConfig.inputParams[finalOutputIndex] = finalOutput;
      return newConfig;
    };
    return reducer;
  };

  /**
   * 必填
   *
   * @return 组件信息
   */
  self.getJadeConfig = () => {
    return jadeConfig ? ensureStateWrapper(jadeConfig) : {
      inputParams: shape.graph.flowType === FLOW_TYPE.APP ?
        self.getDefaultAppInputParams(uuidv4()) : self.getDefaultWorkflowInputParams(),
      outputParams: [{}],
    };
  };

  /**
   * 获取默认workflow输入参数.
   *
   * @returns {[{}]} 输入参数.
   */
  self.getDefaultWorkflowInputParams = () => {
    const stateNode = {
      id: uuidv4(),
      name: 'state',
      type: 'Object',
      from: 'Expand',
      value: [getDefaultReference(uuidv4())],
    };
    return [{
      id: uuidv4(),
      name: 'finalOutput',
      type: 'Object',
      from: 'Expand',
      referenceNode: '',
      referenceId: '',
      referenceKey: '',
      value: [stateNode],
    }];
  };

  /**
   * 获取默认app输入参数.
   * 注意：循环结束节点不包含 enableLog，禁止输出到对话
   *
   * @param id
   * @returns 输入参数.
   */
  self.getDefaultAppInputParams = (id) => {
    const stateNode = {
      id: uuidv4(),
      name: 'state',
      type: 'Object',
      from: 'Expand',
      value: [getDefaultReference(uuidv4())],
    };
    return [{
      id: uuidv4(),
      name: 'finalOutput',
      from: 'Expand',
      type: 'Object',
      editable: false,
      value: [stateNode],
      isRequired: false,
      referenceNode: '',
      referenceKey: '',
      referenceId: '',
    }];
  };

  /**
   * @override
   */
  self.getReactComponents = (shapeStatus, data) => {
    return <LoopEndNodeView shapeStatus={shapeStatus} data={data}/>;
  };

  /**
   * @override
   */
  const reducers = self.reducers;
  self.reducers = (config, action) => {
    const normalizedConfig = ensureStateWrapper(config);
    const reducer = builtInReducers.get(action.type);
    if (reducer) {
      return reducer.reduce(normalizedConfig, action);
    }
    return reducers.apply(self, [normalizedConfig, action]);
  };

  builtInReducers.set('addInput', addLoopEndInputReducer());
  builtInReducers.set('deleteInput', deleteLoopEndInputReducer());

  return self;
};
