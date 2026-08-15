import { useState, useEffect, useCallback } from 'react';
import { Model } from '../types';

const STORAGE_KEY = 'defaultModel';

export function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
      if (data.models?.length > 0 && !selectedModel) {
        const savedDefault = localStorage.getItem(STORAGE_KEY);
        const modelToUse = savedDefault && data.models.some((m: Model) => m.modelId === savedDefault)
          ? savedDefault
          : (data.defaultModel || data.models[0].modelId);
        setSelectedModel(modelToUse);
        localStorage.setItem(STORAGE_KEY, modelToUse);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // 监听 Provider 切换事件，自动刷新模型列表
  useEffect(() => {
    const handleProviderChanged = () => {
      // Provider 切换后，旧模型列表可能无效，重置选中模型并重新拉取
      setSelectedModel('');
      localStorage.removeItem(STORAGE_KEY);
      fetchModels();
    };
    window.addEventListener('provider-changed', handleProviderChanged);
    return () => window.removeEventListener('provider-changed', handleProviderChanged);
  }, [fetchModels]);

  return { models, selectedModel, setSelectedModel, fetchModels };
}
