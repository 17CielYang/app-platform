/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {Slider} from "antd";
import "./style.css";
import PropTypes from "prop-types";
import {useEffect} from "react";
import {useShapeContext} from "@/components/DefaultRoot.jsx";

ByConversationTurn.propTypes = {
    propValue: PropTypes.string.isRequired, // 确保 propValue 是一个必需的number类型
    onValueChange: PropTypes.func.isRequired, // 确保 onNameChange 是一个必需的函数类型
    disabled: PropTypes.bool
};

/**
 * Memory按对话轮次选取
 * 注意：UI已隐藏，固定使用默认值 3 轮
 *
 * @param propValue 前端渲染的值
 * @param onValueChange 参数变化所需调用方法
 * @param disabled 禁用.
 * @returns {JSX.Element} Memory按对话轮次的Dom（已隐藏）
 */
export default function ByConversationTurn({propValue, onValueChange, disabled, i18n}) {
    const DEFAULT_CONVERSATION_TURN = 3; // 固定默认值
    const shape = useShapeContext && useShapeContext();

    // 注册开始节点轮次数（固定为默认值）
    useEffect(() => {
        shape && shape.page.registerObservable({
            nodeId: shape.id,
            observableId: "start_node_conversation_turn_count",
            value: DEFAULT_CONVERSATION_TURN,
            type: "number",
            parentId: null,
            visible: false
        });
        // 确保初始值也设置为默认值
        onValueChange("Integer", DEFAULT_CONVERSATION_TURN.toString());
        shape && shape.emit("start_node_conversation_turn_count", {value: DEFAULT_CONVERSATION_TURN});
    }, []);

    // UI 隐藏，返回空元素
    return null;
}