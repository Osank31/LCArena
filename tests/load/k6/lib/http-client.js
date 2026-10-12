import http from 'k6/http';
import { check } from 'k6';

export class HttpClient {
    constructor(baseUrl, defaultHeaders = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.defaultHeaders = defaultHeaders;
    }

    setToken(token) {
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
    }

    get(path, params = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = Object.assign({}, this.defaultHeaders, params.headers || {});
        return http.get(url, Object.assign({}, params, { headers }));
    }

    post(path, body, params = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = Object.assign(
            { 'Content-Type': 'application/json' },
            this.defaultHeaders,
            params.headers || {}
        );
        const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : body;
        return http.post(url, payload, Object.assign({}, params, { headers }));
    }

    put(path, body, params = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = Object.assign(
            { 'Content-Type': 'application/json' },
            this.defaultHeaders,
            params.headers || {}
        );
        const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : body;
        return http.put(url, payload, Object.assign({}, params, { headers }));
    }

    delete(path, params = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = Object.assign({}, this.defaultHeaders, params.headers || {});
        return http.del(url, params.body, Object.assign({}, params, { headers }));
    }
}
