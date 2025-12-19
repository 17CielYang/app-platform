/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Huawei Technologies Co., Ltd. All rights reserved.
 *  This file is a part of the ModelEngine Project.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

package modelengine.fit.jober.aipp.fitable;

import modelengine.fit.jane.common.entity.OperationContext;
import modelengine.fit.jober.aipp.constants.AippConst;
import modelengine.fit.jober.aipp.dto.AppIdentifier;
import modelengine.fit.jober.aipp.service.AppSyncInvokerService;
import modelengine.fitframework.annotation.Component;
import modelengine.fitframework.annotation.Fit;
import modelengine.fitframework.annotation.Fitable;
import modelengine.fitframework.log.Logger;
import modelengine.fitframework.util.CollectionUtils;
import modelengine.fitframework.util.MapBuilder;
import modelengine.fitframework.util.ObjectUtils;
import modelengine.fitframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 子工作流循环执行Fitable
 * 用于循环执行子工作流并聚合所有迭代的结果
 *
 * @author 杨诗琪
 * @since 2025/12/10
 */
@Component
public class SubFlowLoopFitable {
    private static final Logger log = Logger.get(SubFlowLoopFitable.class);
    
    private static final String SUB_FLOW_ID_KEY = "subFlowId";
    private static final String LOOP_COUNT_KEY = "loopCount";
    private static final String INITIAL_VARIABLES_KEY = "initialVariables";
    private static final String LOOP_NODE_INSTANCE_ID_KEY = "loopNodeInstanceId";
    
    private final AppSyncInvokerService appSyncInvokerService;

    @Fit
    public SubFlowLoopFitable(AppSyncInvokerService appSyncInvokerService) {
        this.appSyncInvokerService = appSyncInvokerService;
    }
    
    /**
     * 存储每个循环节点的迭代结果
     * Key: loopNodeInstanceId, Value: List<Object> 迭代结果列表
     */
    private static final Map<String, List<Object>> loopResultsCache = new ConcurrentHashMap<>();
    
    @SuppressWarnings("unused")
    @Fitable("modelengine.fit.jober.aipp.fitable.SubFlowLoopFitable")
    public List<Map<String, Object>> execute(List<Map<String, Object>> contexts) {
        if (CollectionUtils.isEmpty(contexts)) {
            return contexts;
        }
        
        Map<String, Object> businessData = contexts.get(0);
        Map<String, Object> inputParams = ObjectUtils.cast(businessData.get(AippConst.BS_INIT_CONTEXT_KEY));
        if (inputParams == null) {
            inputParams = new HashMap<>();
        }
        
        // 从 properties 中获取循环配置（这些配置应该在节点定义时设置）
        // 注意：这里需要从节点的 properties 中获取，而不是从 inputParams
        // 但由于 fitable 的调用方式，我们需要从 businessData 或其他地方获取
        // 暂时从 inputParams 中获取，实际应该从节点配置中获取
        String subFlowId = ObjectUtils.cast(inputParams.get(SUB_FLOW_ID_KEY));
        if (StringUtils.isBlank(subFlowId)) {
            log.error("Sub flow ID is required for loop node");
            return contexts;
        }
        
        // 获取循环次数（默认1次）
        int loopCount = 1;
        Object loopCountObj = inputParams.get(LOOP_COUNT_KEY);
        if (loopCountObj != null) {
            if (loopCountObj instanceof Number) {
                loopCount = ((Number) loopCountObj).intValue();
            } else {
                try {
                    loopCount = Integer.parseInt(String.valueOf(loopCountObj));
                } catch (NumberFormatException e) {
                    log.warn("Invalid loop count: {}, using default 1", loopCountObj);
                }
            }
        }
        
        // 获取初始变量
        Map<String, Object> initialVariables = new HashMap<>();
        Object initialVarsObj = inputParams.get(INITIAL_VARIABLES_KEY);
        if (initialVarsObj instanceof Map) {
            initialVariables = ObjectUtils.cast(initialVarsObj);
        }
        
        // 获取租户ID和版本ID
        OperationContext operationContext = ObjectUtils.cast(businessData.get(AippConst.BS_HTTP_CONTEXT_KEY));
        if (operationContext == null) {
            log.error("Operation context is required");
            return contexts;
        }
        String tenantId = operationContext.getTenantId();
        String versionId = ObjectUtils.cast(businessData.get(AippConst.BS_META_VERSION_ID_KEY));
        
        if (StringUtils.isBlank(tenantId)) {
            log.error("Tenant ID and operation context are required");
            return contexts;
        }
        
        // 生成循环节点实例ID，用于标识本次循环执行
        String loopNodeInstanceId = StringUtils.format("loop_{0}_{1}", 
                ObjectUtils.cast(businessData.get(AippConst.BS_AIPP_INST_ID_KEY)), 
                System.currentTimeMillis());
        
        // 初始化结果列表
        List<Object> iterationResults = new ArrayList<>();
        loopResultsCache.put(loopNodeInstanceId, iterationResults);
        
        try {
            // 执行循环
            for (int i = 0; i < loopCount; i++) {
                log.info("Loop iteration {}/{} for subFlow {}, instanceId: {}", 
                        i + 1, loopCount, subFlowId, loopNodeInstanceId);
                
                // 构建子工作流的输入参数
                Map<String, Object> subFlowInputParams = new HashMap<>(initialVariables);
                // 添加循环迭代索引
                subFlowInputParams.put("_loopIndex", i);
                subFlowInputParams.put("_loopCount", loopCount);
                // 添加循环节点实例ID，供循环结束节点使用
                subFlowInputParams.put(LOOP_NODE_INSTANCE_ID_KEY, loopNodeInstanceId);
                // 添加父实例ID
                String parentInstanceId = ObjectUtils.cast(businessData.get(AippConst.BS_AIPP_INST_ID_KEY));
                if (StringUtils.isNotBlank(parentInstanceId)) {
                    subFlowInputParams.put(AippConst.PARENT_INSTANCE_ID, parentInstanceId);
                }
                
                // 构建初始化上下文
                Map<String, Object> initContext = MapBuilder.<String, Object>get()
                        .put(AippConst.BS_INIT_CONTEXT_KEY, subFlowInputParams)
                        .build();
                
                // 调用子工作流
                AppIdentifier appIdentifier = new AppIdentifier(tenantId, subFlowId, versionId);
                long timeout = 300000; // 5分钟超时
                
                // 注意：子工作流的执行结果会通过 AippFlowEndCallback 收集到 loopResultsCache 中
                // 这里调用是同步的，会等待子工作流执行完成
                @SuppressWarnings("unused")
                Object iterationResult = appSyncInvokerService.invoke(
                        appIdentifier, 
                        initContext, 
                        timeout, 
                        operationContext
                );
                
                log.info("Loop iteration {}/{} completed for subFlow {}", i + 1, loopCount, subFlowId);
            }
            
            // 从缓存中获取所有迭代结果
            List<Object> finalResults = loopResultsCache.remove(loopNodeInstanceId);
            if (finalResults == null || finalResults.isEmpty()) {
                log.warn("No results collected for loop node instance {}, using empty list", loopNodeInstanceId);
                finalResults = new ArrayList<>();
            }
            
            // 将结果聚合为数组，放入 businessData
            businessData.put("result", finalResults);
            
            // 返回更新后的 contexts
            return contexts;
            
        } catch (Exception e) {
            // 清理缓存
            loopResultsCache.remove(loopNodeInstanceId);
            log.error("Error executing loop node: {}", e.getMessage(), e);
            throw new RuntimeException(StringUtils.format("Loop execution failed: {0}", e.getMessage()), e);
        }
    }
    
    /**
     * 添加迭代结果到缓存
     * 由 AippFlowEndCallback 调用
     *
     * @param loopNodeInstanceId 循环节点实例ID
     * @param iterationResult 本次迭代的结果
     */
    public static void addIterationResult(String loopNodeInstanceId, Object iterationResult) {
        if (StringUtils.isBlank(loopNodeInstanceId) || iterationResult == null) {
            return;
        }
        loopResultsCache.computeIfAbsent(loopNodeInstanceId, k -> new ArrayList<>())
                .add(iterationResult);
        log.debug("Added iteration result for loop node instance: {}", loopNodeInstanceId);
    }
    
    /**
     * 检查是否为循环节点实例ID
     *
     * @param instanceId 实例ID
     * @return true if it's a loop node instance ID
     */
    @SuppressWarnings("unused")
    public static boolean isLoopNodeInstance(String instanceId) {
        return loopResultsCache.containsKey(instanceId);
    }
}

