/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React from 'react';
import ByConversationTurn from '@/components/start/ByConversationTurn.jsx';
import ByNumber from '@/components/start/ByNumber.jsx';
import ByTokenSize from '@/components/start/ByTokenSize.jsx';
import ByTime from '@/components/start/ByTime.jsx';
import Customizing from '@/components/start/Customizing.jsx';
import {useDataContext, useDispatch} from '@/components/DefaultRoot.jsx';
import {JadeStopPropagationSelect} from '@/components/common/JadeStopPropagationSelect.jsx';
import PropTypes from 'prop-types';
import {FLOW_TYPE} from '@/common/Consts.js';

Memory.propTypes = {
    config: PropTypes.object.isRequired, // 确保 config 是一个必需的对象类型
};

/**
 * 开始节点Memory组件
 * 注意：UI已隐藏，默认不使用历史记录
 *
 * @param config 配置.
 * @param disabled 禁用.
 * @returns {JSX.Element} 开始节点Memory组件的Dom（已隐藏）
 */
export default function Memory({config, disabled}) {
    const dispatch = useDispatch();
    const data = useDataContext();

    // 确保默认设置为"不使用历史记录"
    React.useEffect(() => {
        dispatch({
            actionType: 'changeMemory',
            memoryType: 'NotUseMemory',
            memoryValueType: '',
            memoryValue: null
        });
    }, []);

    // UI 隐藏，返回空元素
    return null;
}