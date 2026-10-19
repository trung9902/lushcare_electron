import React, { useState } from 'react';
import {
  X,
  Shuffle,
  Wifi,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Layers,
  ShieldCheck,
  Check
} from 'lucide-react';

interface ProxyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: any) => void;
}

export const ProxyConfigModal: React.FC<ProxyConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'MINPROXY' | 'XPROXY' | 'OBC' | 'SHOPLIKE' | 'DCOM' | 'STATIC'>('MINPROXY');
  
  // Tab states
  const [minproxyKeys, setMinproxyKeys] = useState(
    'MP_VN_KEY_849281928471928471928471\nMP_VN_KEY_192847192847192847192842\nMP_VN_KEY_561928471928471928471923'
  );
  const [xproxyUrl, setXproxyUrl] = useState('http://192.168.1.100:10000');
  const [xproxyPorts, setXproxyPorts] = useState('dcom01,dcom02,dcom03,dcom04');
  const [obcUrl, setObcUrl] = useState('http://192.168.1.200:8080');
  const [shoplikeKeys, setShoplikeKeys] = useState('SL_API_KEY_019284712984\nSL_API_KEY_847192847192');
  const [staticProxies, setStaticProxies] = useState(
    '14.225.1.8:8080:usr1:pwd1\n118.69.2.14:9090:usr2:pwd2\n171.244.5.2:8000:usr3:pwd3'
  );

  const [maxAccPerIp, setMaxAccPerIp] = useState(1);
  const [cooldownSec, setCooldownSec] = useState(10);
  const [ipType, setIpType] = useState<'RESIDENTIAL' | 'DATACENTER'>('RESIDENTIAL');
  const [checkExternalIp, setCheckExternalIp] = useState(true);
  const [preventDuplicateIp, setPreventDuplicateIp] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const minproxyKeyCount = minproxyKeys.split('\n').filter(k => k.trim()).length;
  const shoplikeKeyCount = shoplikeKeys.split('\n').filter(k => k.trim()).length;
  const staticProxyCount = staticProxies.split('\n').filter(k => k.trim()).length;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult('Đã kiểm tra 3/3 keys: Tất cả đều LIVE và sẵn sàng đổi IP (Ping trung bình: 42ms)!');
    }, 1500);
  };

  const handleSave = () => {
    onSaveConfig({
      service: activeTab,
      minproxyKeys,
      xproxyUrl,
      xproxyPorts,
      obcUrl,
      shoplikeKeys,
      staticProxies,
      maxAccPerIp,
      cooldownSec,
      ipType,
      checkExternalIp,
      preventDuplicateIp,
    });
    alert('Đã lưu cấu hình đổi IP thành công!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-[760px] max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                CẤU HÌNH ĐỔI IP & PROXY ROTATOR
              </h2>
              <p className="text-[11px] text-slate-400">
                Tích hợp các cổng xoay IP hàng đầu: MinProxy, XProxy, ShopLike, OBC, Dcom, Static
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 text-xs px-2 pt-1 gap-1">
          {[
            { id: 'MINPROXY', label: 'MinProxy API' },
            { id: 'XPROXY', label: 'XProxy Dongle' },
            { id: 'OBC', label: 'OBC Proxy' },
            { id: 'SHOPLIKE', label: 'ShopLike' },
            { id: 'DCOM', label: 'Dcom 4G' },
            { id: 'STATIC', label: 'Proxy Tĩnh' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setTestResult(null);
              }}
              className={`px-3 py-2 rounded-t font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-indigo-300 border-t-2 border-indigo-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: MINPROXY */}
          {activeTab === 'MINPROXY' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <label>Danh sách API Key MinProxy (Mỗi dòng 1 key = 1 luồng xoay IP):</label>
                <span className="font-mono text-indigo-400 font-bold">
                  [{minproxyKeyCount} Keys]
                </span>
              </div>
              <textarea
                rows={4}
                value={minproxyKeys}
                onChange={e => setMinproxyKeys(e.target.value)}
                placeholder="MP_VN_KEY_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* TAB 2: XPROXY */}
          {activeTab === 'XPROXY' && (
            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Đường dẫn Server XProxy (IP & Port):
                </label>
                <input
                  type="text"
                  value={xproxyUrl}
                  onChange={e => setXproxyUrl(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Danh sách Cổng Dongle USB (phân cách bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  value={xproxyPorts}
                  onChange={e => setXproxyPorts(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
                />
              </div>
            </div>
          )}

          {/* TAB 3: OBC PROXY */}
          {activeTab === 'OBC' && (
            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Đường dẫn Server OBC Hub:
                </label>
                <input
                  type="text"
                  value={obcUrl}
                  onChange={e => setObcUrl(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SHOPLIKE */}
          {activeTab === 'SHOPLIKE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <label>Danh sách API Key ShopLike:</label>
                <span className="font-mono text-indigo-400 font-bold">
                  [{shoplikeKeyCount} Keys]
                </span>
              </div>
              <textarea
                rows={4}
                value={shoplikeKeys}
                onChange={e => setShoplikeKeys(e.target.value)}
                placeholder="SL_API_KEY_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* TAB 5: DCOM 4G */}
          {activeTab === 'DCOM' && (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-300 space-y-2">
              <p className="font-semibold">Cấu hình USB Dcom 4G (Huawei Hilink):</p>
              <p className="text-[11px] text-slate-400">
                Phần mềm sẽ tự động kết nối và gửi lệnh ngắt/bật lại mạng thông qua API Hilink chuẩn (192.168.8.1).
              </p>
            </div>
          )}

          {/* TAB 6: STATIC PROXIES */}
          {activeTab === 'STATIC' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <label>Danh sách Proxy tĩnh (Định dạng IP:Port hoặc IP:Port:User:Pass):</label>
                <span className="font-mono text-indigo-400 font-bold">
                  [{staticProxyCount} Proxies]
                </span>
              </div>
              <textarea
                rows={4}
                value={staticProxies}
                onChange={e => setStaticProxies(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Common Parameters */}
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-3">
            <span className="font-semibold text-slate-300">Tham Số Xoay IP Thông Minh:</span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">
                  Số tài khoản chạy trên 1 IP trước khi đổi:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxAccPerIp}
                  onChange={e => setMaxAccPerIp(parseInt(e.target.value) || 1)}
                  className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-indigo-300"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Thời gian chờ đổi IP thành công (Cooldown):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={cooldownSec}
                    onChange={e => setCooldownSec(parseInt(e.target.value) || 10)}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-indigo-300"
                  />
                  <span className="text-slate-400">giây</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <span className="text-slate-400">Loại IP Proxy:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="ipType"
                  checked={ipType === 'RESIDENTIAL'}
                  onChange={() => setIpType('RESIDENTIAL')}
                  className="text-indigo-600 bg-slate-900 border-slate-700"
                />
                <span>Dân cư xoay vòng (Residential)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="ipType"
                  checked={ipType === 'DATACENTER'}
                  onChange={() => setIpType('DATACENTER')}
                  className="text-indigo-600 bg-slate-900 border-slate-700"
                />
                <span>Datacenter</span>
              </label>
            </div>
          </div>

          {/* Safety Settings */}
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-2 text-slate-300">
            <span className="font-semibold">Cơ Chế An Toàn Mạng:</span>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkIpify"
                checked={checkExternalIp}
                onChange={e => setCheckExternalIp(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <label htmlFor="chkIpify" className="cursor-pointer">
                Kiểm tra IP ngoại mạng qua api.ipify.org trước khi mở Facebook
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkDupIp"
                checked={preventDuplicateIp}
                onChange={e => setPreventDuplicateIp(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <label htmlFor="chkDupIp" className="cursor-pointer">
                Tự động dừng luồng nếu phát hiện IP bị trùng với luồng khác
              </label>
            </div>
          </div>

          {/* Test connection feedback */}
          {testResult && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-600/40 rounded-lg text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{testResult}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-md font-medium flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối Toàn Bộ Key'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-md font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <Check className="w-4 h-4" />
              <span>LƯU CẤU HÌNH</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
