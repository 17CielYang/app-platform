/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {JadeInputTree} from '@/components/common/JadeInputTree.jsx';
import React from 'react';
import PropTypes from 'prop-types';
import ArrayUtil from '@/components/util/ArrayUtil.js';
import {Collapse} from 'antd';
import {useDispatch, useShapeContext} from '@/components/DefaultRoot.jsx';
import {JadePanelHeader} from '@/components/common/JadePanelHeader.jsx';
import {JadeCollapse} from '@/components/common/JadeCollapse.jsx';

const {Panel} = Collapse;

/**
 * 循环结束节点输入表单.
 * 只显示输出变量选择，禁止输出结果到对话（不显示 enableLog checkbox）
 * 输出变量只能从循环节点的 inputMappings 中选择
 *
 * @param shapeStatus 节点状态.
 * @param data 完整数据对象（包含 inputParams）
 * @constructor
 */
const _LoopEndInputForm = ({shapeStatus, data}) => {
    const dispatch = useDispatch();
    const shape = useShapeContext();
    
    // 从 data 中提取 inputParams
    const inputParams = data && data.inputParams;

    // item被修改.
    const updateItem = (id, changes) => {
        dispatch({type: 'update', id, changes});
    };

    const deleteItem = (id) => {
        dispatch({type: 'deleteInput', id: id});
    };

    const addItem = () => {
        dispatch({type: 'addInput'});
    };

    // 获取 finalOutput 参数，添加空值检查
    const finalOutput = inputParams?.find(item => item.name === 'finalOutput');

    return (<>  
        <JadeCollapse defaultActiveKey={['Output variable']}>
            <Panel
              header={<JadePanelHeader text={'output'} shapeStatus={shapeStatus} onClick={addItem} showAdd={false}/>}
              className='jade-panel'
              key='Output variable'
            >
                {/* 注意：循环结束节点不显示 enableLog checkbox，禁止输出结果到对话 */}
                <JadeInputTree
                  shapeStatus={shapeStatus}
                  data={finalOutput ? [finalOutput] : []}
                  updateItem={updateItem}
                  onDelete={deleteItem}
                  defaultExpandAll={true}
                  width={320}
                />
            </Panel>
        </JadeCollapse>
    </>);
};

_LoopEndInputForm.propTypes = {
    shapeStatus: PropTypes.object,
    data: PropTypes.object,
};

const areEqual = (prevProps, nextProps) => {
    return prevProps.shapeStatus === nextProps.shapeStatus &&
        ArrayUtil.isEqual(prevProps.data?.inputParams, nextProps.data?.inputParams);
};

export const LoopEndInputForm = React.memo(_LoopEndInputForm, areEqual);
