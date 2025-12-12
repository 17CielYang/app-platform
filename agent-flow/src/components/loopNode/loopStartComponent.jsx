/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {defaultComponent} from '@/components/defaultComponent.js';
import React from 'react';

/**
 * 循环开始节点组件
 * 该节点不接受用户配置，由父 LoopNode 控制数据输入
 *
 * @param jadeConfig 配置数据
 * @param shape 图形对象
 */
export const loopStartComponent = (jadeConfig, shape) => {
    const self = defaultComponent(jadeConfig);

    /**
     * 必填
     *
     * @return 组件信息
     */
    self.getJadeConfig = () => {
        return jadeConfig ? jadeConfig : {
            inputParams: [],
            outputParams: [],
        };
    };

    /**
     * @override
     */
    self.getReactComponents = (shapeStatus, data) => {
        // 循环开始节点显示为圆形按钮，中间显示房子图标
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                minHeight: '36px',
                transform: 'translateY(-4px)',
            }}>
                <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{color: '#047bfc'}}
                >
                    <path d="M12 3L2 12H5V20H11V14H13V20H19V12H22L12 3Z" fill="currentColor"/>
                </svg>
            </div>
        );
    };

    return self;
};

