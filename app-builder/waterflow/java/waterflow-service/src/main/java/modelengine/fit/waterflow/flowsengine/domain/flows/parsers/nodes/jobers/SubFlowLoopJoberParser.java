/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025-2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 --------------------------------------------------------------------------------------------*/

package modelengine.fit.waterflow.flowsengine.domain.flows.parsers.nodes.jobers;

import modelengine.fit.waterflow.flowsengine.domain.flows.definitions.nodes.jobers.FlowJober;
import modelengine.fit.waterflow.flowsengine.domain.flows.definitions.nodes.jobers.FlowSubFlowLoopJober;
import modelengine.fit.waterflow.flowsengine.domain.flows.enums.FlowJoberType;
import modelengine.fit.waterflow.flowsengine.domain.flows.parsers.FlowGraphData;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * SubFlowLoop任务解析器
 *
 * @author 皮佳明
 * @since 2025-12-24
 */
public class SubFlowLoopJoberParser implements JoberParser {
    /**
     * 解析循环子流程自动任务
     *
     * @param flowGraphData {@link FlowGraphData} 流程json操作封装对象
     * @param nodeIndex 当前节点索引
     * @return 流程节点任务对象
     */
    @Override
    public FlowJober parseJober(FlowGraphData flowGraphData, int nodeIndex) {
        FlowJober flowJober = new FlowSubFlowLoopJober();
        flowJober.setType(FlowJoberType.SUB_FLOW_LOOP_JOBER);
        commonParse(flowJober, flowGraphData, nodeIndex);

        // 获取前端配置的 fitables，如果为空则自动添加默认的 SubFlowLoopFitable
        Set<String> fitables = flowGraphData.getNodeJoberFitables(nodeIndex);
        if (fitables == null || fitables.isEmpty()) {
            fitables = new LinkedHashSet<>();
            fitables.add("modelengine.fit.jober.aipp.fitable.SubFlowLoopFitable");
        }
        flowJober.setFitables(fitables);

        // 从节点的 properties 中获取 subFlowId 和 loopConfig，添加到 jober 的 properties
        Map<String, Object> nodeProperties = flowGraphData.getNodeProperties(nodeIndex);
        if (nodeProperties != null) {
            Map<String, String> joberProperties = flowJober.getProperties();
            if (nodeProperties.containsKey("subFlowId")) {
                joberProperties.put("subFlowId", String.valueOf(nodeProperties.get("subFlowId")));
            }
            if (nodeProperties.containsKey("loopConfig")) {
                // 将 loopConfig 对象转换为 JSON 字符串存储
                Object loopConfig = nodeProperties.get("loopConfig");
                if (loopConfig != null) {
                    joberProperties.put("loopConfig", loopConfig.toString());
                }
            }
        }

        return flowJober;
    }
}
