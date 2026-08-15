/**
 * vitest server 测试专用 setup
 *
 * 必须在任何 db 模块 import 之前设置 OPC_DB_PATH=:memory:，
 * 否则 ESM import 提升会导致测试连到真实数据库（data/opc.db）。
 * vitest 的 setupFiles 会在测试文件的所有 import 之前执行，天然满足此约束。
 */
process.env.OPC_DB_PATH = ':memory:';
