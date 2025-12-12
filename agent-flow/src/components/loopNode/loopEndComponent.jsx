/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {v4 as uuidv4} from 'uuid';
import {defaultComponent} from '@/components/defaultComponent.js';
import {
  AddInputReducer,
  DeleteInputReducer,
  UpdateInputReducer,
} from '@/components/end/reducers/reducers.js';
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
    addReducer(builtInReducers, DeleteInputReducer(shape, self));
    addReducer(builtInReducers, AddInputReducer(shape, self));

  /**
   * 必填
   *
   * @return 组件信息
   */
  self.getJadeConfig = () => {
    return jadeConfig ? jadeConfig : {
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
    return [{
      id: uuidv4(),
      name: 'finalOutput',
      type: 'String',
      from: 'Reference',
      referenceNode: '',
      referenceId: '',
      referenceKey: '',
      value: [],
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
    return [{
      id: uuidv4(),
      name: 'finalOutput',
      from: 'Expand',
      type: 'Object',
      editable: false,
      value: [getDefaultReference(id)],
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
    const reducer = builtInReducers.get(action.type);
    return reducer ? reducer.reduce(config, action) : reducers.apply(self, [config, action]);
  };

  return self;
};
