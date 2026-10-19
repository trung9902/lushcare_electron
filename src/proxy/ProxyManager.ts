/**
 * LushCare Electron - Proxy & IP Rotation Manager
 * Quản lý đa giao thức Proxy (HTTP, HTTPS, SOCKS5), kiểm tra kết nối & độ trễ,
 * tích hợp 5 cổng xoay IP tự động (MinProxy, XProxy Dongle, ShopLike, OBC, Static)
 * và cơ chế Mutex/Lock tránh gọi reset quá nhanh gây lỗi hoặc khóa API.
 */

import axios, { AxiosRequestConfig } from 'axios';
import * as proxyChain from 'proxy-chain';
import { ProxyCheckResult, ProxyRotateResult } from '../shared/types';

export interface ParsedProxy {
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  raw: string;
}

export interface ProxyRotateRequest {
  proxyType: 'minproxy' | 'xproxy' | 'shoplike' | 'obc' | 'static' | 'dcom';
  apiKey?: string;
  apiUrl?: string;
  proxyString?: string;
  proxyConfigId?: number;
}

interface MutexEntry {
  locked: boolean;
  lockedUntil: number; // Timestamp ms
  cooldownUntil: number; // Timestamp ms
}

export class ProxyManager {
  private static instance: ProxyManager;

  // Bản đồ Mutex khóa proxy theo key định danh (tránh gọi reset đồng thời)
  private mutexMap = new Map<string, MutexEntry>();

  // Bản đồ quản lý các proxy đã anonymize qua proxy-chain để dọn dẹp khi tắt
  private anonymizedMap = new Map<string, string>();

  private constructor() {}

  public static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }

  // ==========================================
  // 1. PHÂN TÍCH & CHUẨN HÓA ĐỊNH DẠNG PROXY
  // ==========================================

  /**
   * Phân tích chuỗi proxy thành object chuẩn
   * Hỗ trợ các định dạng:
   * - IP:Port
   * - IP:Port:User:Pass
   * - http://user:pass@host:port
   * - socks5://user:pass@host:port
   */
  public parseProxy(proxyStr: string): ParsedProxy | null {
    if (!proxyStr || !proxyStr.trim()) return null;
    const cleanStr = proxyStr.trim();

    try {
      // 1. Trường hợp có protocol dạng URL: protocol://user:pass@host:port
      if (cleanStr.includes('://')) {
        const url = new URL(cleanStr);
        const protocol = url.protocol.replace(':', '') as any;
        return {
          protocol: ['http', 'https', 'socks4', 'socks5'].includes(protocol) ? protocol : 'http',
          host: url.hostname,
          port: parseInt(url.port, 10),
          username: url.username ? decodeURIComponent(url.username) : undefined,
          password: url.password ? decodeURIComponent(url.password) : undefined,
          raw: cleanStr,
        };
      }

      // 2. Trường hợp dạng dấu hai chấm: IP:Port hoặc IP:Port:User:Pass
      const parts = cleanStr.split(':');
      if (parts.length === 2) {
        return {
          protocol: 'http',
          host: parts[0].trim(),
          port: parseInt(parts[1].trim(), 10),
          raw: cleanStr,
        };
      } else if (parts.length >= 4) {
        return {
          protocol: 'http',
          host: parts[0].trim(),
          port: parseInt(parts[1].trim(), 10),
          username: parts[2].trim(),
          password: parts.slice(3).join(':').trim(),
          raw: cleanStr,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Chuyển đổi proxy thành chuỗi URL chuẩn hóa
   */
  public toProxyUrl(parsed: ParsedProxy): string {
    const auth = parsed.username ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password || '')}@` : '';
    return `${parsed.protocol}://${auth}${parsed.host}:${parsed.port}`;
  }

  /**
   * Tạo Proxy cục bộ ẩn danh qua proxy-chain cho Chromium
   * Giúp trình duyệt không bị hiện pop-up hỏi user/pass của Proxy
   */
  public async getAnonymizedUrl(proxyString: string): Promise<string> {
    const parsed = this.parseProxy(proxyString);
    if (!parsed) return proxyString;

    // Nếu proxy không có user/pass thì không cần qua proxy-chain
    if (!parsed.username) {
      return this.toProxyUrl(parsed);
    }

    const standardUrl = this.toProxyUrl(parsed);
    if (this.anonymizedMap.has(standardUrl)) {
      return this.anonymizedMap.get(standardUrl)!;
    }

    try {
      const localUrl = await proxyChain.anonymizeProxy(standardUrl);
      this.anonymizedMap.set(standardUrl, localUrl);
      return localUrl;
    } catch {
      return standardUrl;
    }
  }

  /**
   * Đóng toàn bộ các local server proxy-chain khi tắt ứng dụng
   */
  public async closeAllAnonymized(): Promise<void> {
    for (const localUrl of this.anonymizedMap.values()) {
      try {
        await proxyChain.closeAnonymizedProxy(localUrl, true);
      } catch {
        // Bỏ qua lỗi
      }
    }
    this.anonymizedMap.clear();
  }

  // ==========================================
  // 2. KIỂM TRA KẾT NỐI & ĐỘ TRỄ (PING / SPEED)
  // ==========================================

  /**
   * Kiểm tra Live/Die, độ trễ và IP ngoại mạng của Proxy
   */
  public async checkProxy(proxyString: string, timeoutMs = 10000): Promise<ProxyCheckResult> {
    const parsed = this.parseProxy(proxyString);
    if (!parsed) {
      return {
        isAlive: false,
        publicIp: null,
        responseTimeMs: 0,
        country: null,
        city: null,
        errorMessage: 'Định dạng Proxy không hợp lệ (hỗ trợ IP:Port hoặc IP:Port:User:Pass)',
      };
    }

    const startTime = Date.now();
    try {
      // Dùng proxy-chain tạo bridge tạm nếu có xác thực
      const targetUrl = await this.getAnonymizedUrl(proxyString);
      const bridgeParsed = new URL(targetUrl);

      const axiosConfig: AxiosRequestConfig = {
        timeout: timeoutMs,
        proxy: {
          host: bridgeParsed.hostname,
          port: parseInt(bridgeParsed.port, 10),
          protocol: bridgeParsed.protocol.replace(':', ''),
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      };

      // Gọi API lấy thông tin IP
      const ipCheckUrls = [
        'http://ip-api.com/json',
        'https://api.myip.com',
        'https://api.ipify.org?format=json',
      ];

      let response: any = null;
      let lastErr: any = null;

      for (const checkUrl of ipCheckUrls) {
        try {
          response = await axios.get(checkUrl, axiosConfig);
          if (response && response.data) {
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      if (!response || !response.data) {
        throw lastErr || new Error('Không thể kết nối qua proxy tới dịch vụ kiểm tra IP');
      }

      const latency = Date.now() - startTime;
      const data = response.data;

      const publicIp = data.query || data.ip || null;
      const country = data.country || data.country_name || null;
      const city = data.city || null;

      return {
        isAlive: true,
        publicIp,
        responseTimeMs: latency,
        country,
        city,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      return {
        isAlive: false,
        publicIp: null,
        responseTimeMs: latency,
        country: null,
        city: null,
        errorMessage: error?.message || 'Proxy Die hoặc kết nối quá hạn (Timeout)',
      };
    }
  }

  // ==========================================
  // 3. TÍCH HỢP CÁC CỔNG XOAY IP TỰ ĐỘNG
  // ==========================================

  /**
   * Gọi lệnh xoay IP tự động theo loại dịch vụ
   */
  public async rotateProxy(request: ProxyRotateRequest): Promise<ProxyRotateResult> {
    const lockKey = this.getLockKey(request);

    // Kiểm tra Cooldown và Mutex Lock
    const lockCheck = this.acquireMutex(lockKey);
    if (!lockCheck.success) {
      return {
        success: false,
        newIp: null,
        newProxyString: null,
        cooldownSeconds: lockCheck.remainingCooldownSec,
        message: `Proxy đang trong thời gian chờ (Cooldown còn ${lockCheck.remainingCooldownSec}s)`,
      };
    }

    try {
      let result: ProxyRotateResult;

      switch (request.proxyType) {
        case 'minproxy':
          result = await this.rotateMinProxy(request.apiKey);
          break;

        case 'xproxy':
          result = await this.rotateXProxy(request.apiUrl, request.proxyString);
          break;

        case 'shoplike':
          result = await this.rotateShopLike(request.apiKey);
          break;

        case 'obc':
          result = await this.rotateObc(request.apiUrl, request.proxyString);
          break;

        case 'static':
        default:
          result = {
            success: true,
            newIp: null,
            newProxyString: request.proxyString || null,
            cooldownSeconds: 0,
            message: 'Proxy tĩnh, không hỗ trợ xoay IP',
          };
          break;
      }

      // Thiết lập cooldown sau khi xoay thành công
      if (result.success && result.cooldownSeconds > 0) {
        this.setCooldown(lockKey, result.cooldownSeconds);
      }

      return result;
    } catch (err: any) {
      return {
        success: false,
        newIp: null,
        newProxyString: null,
        cooldownSeconds: 5,
        message: `Lỗi gọi API đổi IP: ${err?.message || err}`,
      };
    } finally {
      this.releaseMutex(lockKey);
    }
  }

  /**
   * MinProxy API: https://dash.minproxy.vn / https://api.minproxy.vn
   */
  private async rotateMinProxy(apiKey?: string): Promise<ProxyRotateResult> {
    if (!apiKey) {
      return { success: false, newIp: null, newProxyString: null, cooldownSeconds: 0, message: 'Thiếu API Key MinProxy' };
    }

    const endpoints = [
      `https://dash.minproxy.vn/api/player/v1/proxy/get-new-proxy?api_key=${encodeURIComponent(apiKey)}`,
      `https://api.minproxy.vn/api_service/request-key?api_key=${encodeURIComponent(apiKey)}`,
    ];

    let lastError = '';
    for (const endpoint of endpoints) {
      try {
        const res = await axios.get(endpoint, { timeout: 15000 });
        const resData = res.data;

        // MinProxy v1: { code: 2, status: 100, data: { ip: "...", http_proxy: "ip:port" } }
        if (resData.status === 100 || resData.code === 2 || resData.code === 1) {
          const data = resData.data || {};
          const newProxy = data.http_proxy || data.proxy || (data.ip && data.port ? `${data.ip}:${data.port}` : null);
          const cooldown = data.next_change || data.timeout || 60;
          return {
            success: true,
            newIp: data.ip || null,
            newProxyString: newProxy,
            cooldownSeconds: cooldown,
            message: 'Đổi IP MinProxy thành công',
          };
        }

        // Báo lỗi cooldown từ server: code: 1, message: "wait X seconds"
        const msg = resData.message || resData.msg || '';
        const matchWait = msg.match(/(\d+)/);
        const waitSec = matchWait ? parseInt(matchWait[1], 10) : 30;

        return {
          success: false,
          newIp: null,
          newProxyString: null,
          cooldownSeconds: waitSec,
          message: msg || 'MinProxy chưa hết thời gian chờ đổi IP',
        };
      } catch (e: any) {
        lastError = e?.message || String(e);
      }
    }

    return {
      success: false,
      newIp: null,
      newProxyString: null,
      cooldownSeconds: 10,
      message: `Không kết nối được server MinProxy: ${lastError}`,
    };
  }

  /**
   * XProxy Dongle Hub (Reset thiết bị Dcom vật lý theo cổng/proxy)
   */
  private async rotateXProxy(apiUrl?: string, proxyString?: string): Promise<ProxyRotateResult> {
    const hubUrl = apiUrl || 'http://192.168.1.100:10001';
    const proxyTarget = proxyString || '';

    // Endpoint chuẩn của XProxy: /reset?proxy=192.168.1.100:port
    const resetUrl = `${hubUrl.replace(/\/+$/, '')}/reset?proxy=${encodeURIComponent(proxyTarget)}`;

    try {
      const res = await axios.get(resetUrl, { timeout: 25000 });
      const data = res.data;

      // XProxy trả về JSON: { "status": true, "msg": "reset_success" } hoặc text
      const isSuccess = data?.status === true || (typeof data === 'string' && data.toLowerCase().includes('success'));

      if (isSuccess) {
        return {
          success: true,
          newIp: null, // Sẽ được kiểm tra lại qua checkProxy
          newProxyString: proxyString || null,
          cooldownSeconds: 30,
          message: 'Lệnh reset XProxy đã được gửi thành công',
        };
      }

      const msg = data?.msg || data?.message || 'XProxy đang bận hoặc quá số lần reset';
      return {
        success: false,
        newIp: null,
        newProxyString: null,
        cooldownSeconds: 20,
        message: msg,
      };
    } catch (e: any) {
      return {
        success: false,
        newIp: null,
        newProxyString: null,
        cooldownSeconds: 15,
        message: `Lỗi kết nối XProxy Hub: ${e?.message || e}`,
      };
    }
  }

  /**
   * ShopLike API: http://api.shoplike.vn/v2/proxy/getNewProxy?key=...
   */
  private async rotateShopLike(apiKey?: string): Promise<ProxyRotateResult> {
    if (!apiKey) {
      return { success: false, newIp: null, newProxyString: null, cooldownSeconds: 0, message: 'Thiếu API Key ShopLike' };
    }

    const endpoint = `http://api.shoplike.vn/v2/proxy/getNewProxy?key=${encodeURIComponent(apiKey)}`;
    try {
      const res = await axios.get(endpoint, { timeout: 15000 });
      const data = res.data;

      if (data?.status === 'success' && data?.data) {
        const proxyInfo = data.data;
        const proxyStr = proxyInfo.proxy || `${proxyInfo.ip}:${proxyInfo.port}`;
        return {
          success: true,
          newIp: proxyInfo.ip || null,
          newProxyString: proxyStr,
          cooldownSeconds: proxyInfo.time_renew || 60,
          message: 'Đổi IP ShopLike thành công',
        };
      }

      return {
        success: false,
        newIp: null,
        newProxyString: null,
        cooldownSeconds: data?.time_renew || 30,
        message: data?.mess || data?.message || 'ShopLike báo lỗi đổi IP',
      };
    } catch (e: any) {
      return {
        success: false,
        newIp: null,
        newProxyString: null,
        cooldownSeconds: 10,
        message: `Lỗi kết nối ShopLike: ${e?.message || e}`,
      };
    }
  }

  /**
   * OBC Proxy Hub
   */
  private async rotateObc(apiUrl?: string, proxyString?: string): Promise<ProxyRotateResult> {
    const hubUrl = apiUrl || 'http://127.0.0.1:8080';
    const target = proxyString || '';
    const resetUrl = `${hubUrl.replace(/\/+$/, '')}/api/reset?proxy=${encodeURIComponent(target)}`;

    try {
      const res = await axios.get(resetUrl, { timeout: 20000 });
      const data = res.data;
      const isSuccess = data?.status === 1 || data?.success === true;

      return {
        success: isSuccess,
        newIp: null,
        newProxyString: proxyString || null,
        cooldownSeconds: 25,
        message: isSuccess ? 'Gửi lệnh reset OBC thành công' : data?.message || 'OBC reset thất bại',
      };
    } catch (e: any) {
      return {
        success: false,
        newIp: null,
        newProxyString: null,
        cooldownSeconds: 15,
        message: `Lỗi kết nối OBC Hub: ${e?.message || e}`,
      };
    }
  }

  // ==========================================
  // 4. MUTEX / LOCK QUẢN LÝ ĐỒNG THỜI & COOLDOWN
  // ==========================================

  private getLockKey(request: ProxyRotateRequest): string {
    if (request.proxyConfigId) return `id_${request.proxyConfigId}`;
    if (request.apiKey) return `key_${request.apiKey}`;
    if (request.proxyString) return `str_${request.proxyString}`;
    if (request.apiUrl) return `url_${request.apiUrl}`;
    return `type_${request.proxyType}`;
  }

  private acquireMutex(key: string): { success: boolean; remainingCooldownSec: number } {
    const now = Date.now();
    const entry = this.mutexMap.get(key);

    if (entry) {
      // 1. Kiểm tra nếu đang bị khóa bởi tiến trình khác
      if (entry.locked && entry.lockedUntil > now) {
        return { success: false, remainingCooldownSec: Math.ceil((entry.lockedUntil - now) / 1000) };
      }

      // 2. Kiểm tra nếu chưa hết thời gian chờ đổi IP (Cooldown)
      if (entry.cooldownUntil > now) {
        return { success: false, remainingCooldownSec: Math.ceil((entry.cooldownUntil - now) / 1000) };
      }
    }

    // Đánh dấu khóa tạm 30s (timeout phòng ngừa crash)
    this.mutexMap.set(key, {
      locked: true,
      lockedUntil: now + 30000,
      cooldownUntil: entry?.cooldownUntil || 0,
    });

    return { success: true, remainingCooldownSec: 0 };
  }

  private releaseMutex(key: string): void {
    const entry = this.mutexMap.get(key);
    if (entry) {
      entry.locked = false;
      entry.lockedUntil = 0;
    }
  }

  private setCooldown(key: string, cooldownSec: number): void {
    const entry = this.mutexMap.get(key) || { locked: false, lockedUntil: 0, cooldownUntil: 0 };
    entry.cooldownUntil = Date.now() + cooldownSec * 1000;
    this.mutexMap.set(key, entry);
  }
}

export const proxyManager = ProxyManager.getInstance();
