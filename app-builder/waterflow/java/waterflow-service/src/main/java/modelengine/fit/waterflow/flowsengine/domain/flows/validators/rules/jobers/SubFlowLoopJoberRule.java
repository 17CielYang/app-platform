/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025-2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 --------------------------------------------------------------------------------------------*/

package modelengine.fit.waterflow.flowsengine.domain.flows.validators.rules.jobers;

import modelengine.fit.waterflow.exceptions.WaterflowParamException;
import modelengine.fit.waterflow.flowsengine.domain.flows.definitions.nodes.jobers.FlowJober;
import modelengine.fit.waterflow.flowsengine.domain.flows.enums.FlowJoberType;
import modelengine.fitframework.inspection.Validation;

/**
 * 循环子流程节点自动任务校验规则
 *
 * @author 皮佳明
 * @since 2025-12-24
 */
public class SubFlowLoopJoberRule implements JoberRule {
    /**
     * 校验循环子流程节点自动任务类型的合法性
     * 当校验不通过时，抛出运行时异常{@link WaterflowParamException}
     *
     * @param flowJober 流程节点自动任务
     */
    @Override
    public void apply(FlowJober flowJober) {
        Validation.notNull(flowJober.getType(), exception("flow jober type"));
        Validation.equals(FlowJoberType.SUB_FLOW_LOOP_JOBER, flowJober.getType(), exception("flow jober type"));
        // 循环节点通过 subFlowId 引用子流程，fitables 可以为空
        Validation.notNull(flowJober.getFitables(), exception("flow jober fitables"));
    }
}
