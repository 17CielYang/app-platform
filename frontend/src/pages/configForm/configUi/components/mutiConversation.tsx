/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, { useEffect } from 'react';
import { Form, Select, Slider } from 'antd';
import { useTranslation } from 'react-i18next';

const MutiConversation = (props) => {
  const { t } = useTranslation();
  const { onTypeChange, onValueChange, disabled } = props;

  const DEFAULT_CONVERSATION_TURN = 3; // 固定默认值

  // 确保初始值为默认值
  useEffect(() => {
    onTypeChange('ByConversationTurn');
    onValueChange(DEFAULT_CONVERSATION_TURN.toString());
  }, []);

  // UI 已隐藏，返回空元素
  return null;
};

export default MutiConversation;