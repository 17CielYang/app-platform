/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, { useEffect, useState, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { setConfigItem } from '@/store/appConfig/config';
import { setHistorySwitch } from '@/store/common/common';
import MultiConversationContent from './mutiConversation';
import { Collapse, Switch, Form } from 'antd';
import CloseImg from '@/assets/images/close_arrow.png';
import OpenImg from '@/assets/images/open_arrow.png';
const { Panel } = Collapse;

const MultiConversationContainer = (props) => {
  const { graphOperator, config, updateData, readOnly } = props;
  const [memoryValues, setMemoryValues] = useState(null);
  const [memorySwitch, setMemorySwitch] = useState(false); // 默认不勾选
  const haveSetMemory = useRef(false);
  const dispatch = useAppDispatch();
  const appConfig = useAppSelector((state) => state.appConfigStore.inputConfigData);
  const historySwitch = useAppSelector((state) => state.commonStore.historySwitch);
  const useMemory = useAppSelector((state) => state.commonStore.useMemory);
  const [form] = Form.useForm();

  // 更新Memory
  const updateMemory = (value) => {
    if (config.from === 'graph') {
      graphOperator.update(config.defaultValue, value);
    } else {
      dispatch(setConfigItem({ key: config.name, value }));
    }
    updateData();
  };

  // 更新是否展示多轮对话开关
  const historySwitchChange = (checked, event) => {
    event.stopPropagation();
    setMemorySwitch(checked);
    updateMemory({ memorySwitch: checked });
  };

  // 更新多轮对话type
  const onTypeChange = (e) => {
    updateMemory({ type: e});
  };

  // 更新多轮对话value
  const onValueChange = (newValue) => {
    updateMemory({ value: newValue });
  };

  useEffect(() => {
    if(!memoryValues) {
      return;
    }
    // 强制设置为 false（默认不勾选）
    setMemorySwitch(false);
    dispatch(setHistorySwitch(false));
    const valuesWithSwitchOff = { ...memoryValues, memorySwitch: false };
    form.setFieldsValue(valuesWithSwitchOff);
    haveSetMemory.current = true;
  }, [memoryValues]);

  useEffect(() => {
    if (useMemory !== memoryValues?.memorySwitch && haveSetMemory.current) {
      updateMemory({ memorySwitch: useMemory });
    }
  }, [useMemory]);

  useEffect(() => {
    if (!config.from) {
      return;
    }
    haveSetMemory.current = false;
    if (config.from === 'graph') {
      setMemoryValues(graphOperator.getConfig(config.defaultValue));
    } else {
      setMemoryValues(config.defaultValue);
    }
  }, [config, appConfig]);

  // 整个组件隐藏，返回 null
  return null;
};

export default MultiConversationContainer;
