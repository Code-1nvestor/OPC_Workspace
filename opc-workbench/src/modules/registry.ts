/**
 * 模块注册机制 - 新模块 = 一个组件 + 一行注册
 * 
 * 使用方式：
 * 1. 创建组件：src/modules/MyModule.tsx，实现 ModuleComponentProps 接口
 * 2. 注册：在下面 registry 中添加一行
 */

import { ComponentType } from 'react';

export interface ModuleData {
  id: string;
  title: string;
  /** 图标名称（lucide-react） */
  icon: string;
  /** Grid 跨列数（默认 1） */
  colSpan?: number;
  /** 组件 */
  component: ComponentType<ModuleComponentProps>;
}

export interface ModuleComponentProps {
  /** 手动刷新触发器 */
  onRefresh: () => void;
}

// ============= 注册表 =============
// 新增模块：import 组件 -> push 一条 -> 完成

import OngoingModule from './OngoingModule';
import TodoModule from './TodoModule';
import NewsModule from './NewsModule';
import CountdownModule from './CountdownModule';
import LinksModule from './LinksModule';
import FocusModule from './FocusModule';

export const moduleRegistry: ModuleData[] = [
  {
    id: 'ongoing',
    title: '进行中的事项',
    icon: 'Activity',
    colSpan: 2,
    component: OngoingModule,
  },
  {
    id: 'todos',
    title: '待办事项',
    icon: 'CheckSquare',
    colSpan: 1,
    component: TodoModule,
  },
  {
    id: 'news',
    title: 'AI 最新进展',
    icon: 'Newspaper',
    colSpan: 2,
    component: NewsModule,
  },
  {
    id: 'countdowns',
    title: '重要日期倒计时',
    icon: 'CalendarClock',
    colSpan: 1,
    component: CountdownModule,
  },
  {
    id: 'links',
    title: '常用链接导航',
    icon: 'Link',
    colSpan: 1,
    component: LinksModule,
  },
  {
    id: 'focus',
    title: '番茄专注钟',
    icon: 'Timer',
    colSpan: 1,
    component: FocusModule,
  },
];
