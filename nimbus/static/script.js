// ─── Orb WebGL Setup ───────────────────────────────────────────

const VERT = `
precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform float iTime;
uniform vec3  iResolution;
uniform float hue;
uniform float hover;
uniform float rot;
uniform float hoverIntensity;
varying vec2 vUv;

vec3 rgb2yiq(vec3 c) {
  return vec3(dot(c,vec3(0.299,0.587,0.114)), dot(c,vec3(0.596,-0.274,-0.322)), dot(c,vec3(0.211,-0.523,0.312)));
}
vec3 yiq2rgb(vec3 c) {
  return vec3(c.x+0.956*c.y+0.621*c.z, c.x-0.272*c.y-0.647*c.z, c.x-1.106*c.y+1.703*c.z);
}
vec3 adjustHue(vec3 color, float hueDeg) {
  float hueRad = hueDeg * 3.14159265 / 180.0;
  vec3 yiq = rgb2yiq(color);
  float cosA = cos(hueRad), sinA = sin(hueRad);
  yiq.y = yiq.y*cosA - yiq.z*sinA;
  yiq.z = yiq.y*sinA + yiq.z*cosA;
  return yiq2rgb(yiq);
}
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z) * p3.zyx);
}
float snoise3(vec3 p) {
  const float K1 = 0.333333333, K2 = 0.166666667;
  vec3 i  = floor(p + (p.x+p.y+p.z)*K1);
  vec3 d0 = p - (i - (i.x+i.y+i.z)*K2);
  vec3 e  = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e*(1.0-e.zxy);
  vec3 i2 = 1.0 - e.zxy*(1.0-e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)), 0.0);
  vec4 n = h*h*h*h * vec4(dot(d0,hash33(i)), dot(d1,hash33(i+i1)), dot(d2,hash33(i+i2)), dot(d3,hash33(i+1.0)));
  return dot(vec4(31.316), n);
}
vec4 extractAlpha(vec3 colorIn) {
  float a = max(max(colorIn.r, colorIn.g), colorIn.b);
  return vec4(colorIn.rgb / (a + 1e-5), a);
}
const vec3  baseColor1  = vec3(0.149, 0.490, 0.894);
const vec3  baseColor2  = vec3(0.200, 0.780, 0.980);
const vec3  baseColor3  = vec3(0.020, 0.090, 0.250);
const float innerRadius = 0.6;
const float noiseScale  = 0.65;
float light1(float i, float a, float d) { return i / (1.0 + d*a); }
float light2(float i, float a, float d) { return i / (1.0 + d*d*a); }

vec4 draw(vec2 uv) {
  vec3 c1 = adjustHue(baseColor1, hue);
  vec3 c2 = adjustHue(baseColor2, hue);
  vec3 c3 = adjustHue(baseColor3, hue);
  float ang = atan(uv.y, uv.x);
  float len = length(uv);
  float invLen = len > 0.0 ? 1.0/len : 0.0;
  float n0 = snoise3(vec3(uv*noiseScale, iTime*0.5))*0.5 + 0.5;
  float r0 = mix(mix(innerRadius,1.0,0.4), mix(innerRadius,1.0,0.6), n0);
  float d0 = distance(uv, (r0*invLen)*uv);
  float v0 = light1(1.0, 10.0, d0);
  v0 *= smoothstep(r0*1.05, r0, len);
  float cl = cos(ang + iTime*2.0)*0.5 + 0.5;
  float a  = iTime * -1.0;
  vec2  pos = vec2(cos(a), sin(a)) * r0;
  float d  = distance(uv, pos);
  float v1 = light2(1.5, 5.0, d) * light1(1.0, 50.0, d0);
  float v2 = smoothstep(1.0, mix(innerRadius,1.0,n0*0.5), len);
  float v3 = smoothstep(innerRadius, mix(innerRadius,1.0,0.5), len);
  vec3 col = mix(c3, mix(c1, c2, cl), v0);
  col = (col + v1) * v2 * v3;
  return extractAlpha(clamp(col, 0.0, 1.0));
}

vec4 mainImage(vec2 fragCoord) {
  vec2  center = iResolution.xy * 0.5;
  float size   = min(iResolution.x, iResolution.y);
  vec2  uv     = (fragCoord - center) / size * 2.0;
  float s = sin(rot), c = cos(rot);
  uv = vec2(c*uv.x - s*uv.y, s*uv.x + c*uv.y);
  uv.x += hover * hoverIntensity * 0.1 * sin(uv.y*10.0 + iTime);
  uv.y += hover * hoverIntensity * 0.1 * sin(uv.x*10.0 + iTime);
  return draw(uv);
}
void main() {
  vec4 col = mainImage(vUv * iResolution.xy);
  gl_FragColor = vec4(col.rgb * col.a, col.a);
}`;

// Mini WebGL helpers
class Renderer {
    constructor({ alpha, premultipliedAlpha } = {}) {
        this.gl = document.createElement('canvas').getContext('webgl', { alpha, premultipliedAlpha });
    }
    setSize(w, h) { this.gl.canvas.width = w; this.gl.canvas.height = h; this.gl.viewport(0, 0, w, h); }
    render({ scene }) { this.gl.clear(this.gl.COLOR_BUFFER_BIT); scene.draw(); }
}
class Program {
    constructor(gl, { vertex, fragment, uniforms }) {
        this.gl = gl; this.uniforms = uniforms;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vertex); gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragment); gl.compileShader(fs);
        this.prog = gl.createProgram();
        gl.attachShader(this.prog, vs); gl.attachShader(this.prog, fs); gl.linkProgram(this.prog);
        this.attributeLocations = { position: gl.getAttribLocation(this.prog, 'position'), uv: gl.getAttribLocation(this.prog, 'uv') };
        this.uniformLocations = {};
        Object.keys(uniforms).forEach(k => { this.uniformLocations[k] = gl.getUniformLocation(this.prog, k); });
    }
    use() {
        const gl = this.gl; gl.useProgram(this.prog);
        Object.keys(this.uniforms).forEach(k => {
            const loc = this.uniformLocations[k]; const val = this.uniforms[k].value;
            if (typeof val === 'number') gl.uniform1f(loc, val);
            else if (val && val.x !== undefined) gl.uniform3f(loc, val.x || 0, val.y || 0, val.z || 0);
        });
    }
}
class Triangle {
    constructor(gl) {
        this.gl = gl;
        this.pos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pos);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        this.uv = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uv);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);
    }
    bind(prog) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pos); gl.enableVertexAttribArray(prog.attributeLocations.position); gl.vertexAttribPointer(prog.attributeLocations.position, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uv); gl.enableVertexAttribArray(prog.attributeLocations.uv); gl.vertexAttribPointer(prog.attributeLocations.uv, 2, gl.FLOAT, false, 0, 0);
    }
}
class Mesh {
    constructor(gl, { geometry, program }) { this.gl = gl; this.geometry = geometry; this.program = program; }
    draw() { this.program.use(); this.geometry.bind(this.program); this.gl.drawArrays(this.gl.TRIANGLES, 0, 3); }
}
class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; }
}

// Init orb
const orbContainer = document.getElementById('orb-container');
const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
const gl = renderer.gl;
gl.clearColor(0, 0, 0, 0);
orbContainer.appendChild(gl.canvas);

const geometry = new Triangle(gl);
const program = new Program(gl, {
    vertex: VERT, fragment: FRAG,
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3() },
        hue: { value: 0 },       // blue-ish to match Nimbus theme
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: 0.3 },
    }
});
const mesh = new Mesh(gl, { geometry, program });

function resizeOrb() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = orbContainer.clientWidth;
    const h = orbContainer.clientHeight;
    renderer.setSize(w * dpr, h * dpr);
    gl.canvas.style.width = w + 'px';
    gl.canvas.style.height = h + 'px';
    program.uniforms.iResolution.value.set(w * dpr, h * dpr, (w * dpr) / (h * dpr));
}
window.addEventListener('resize', resizeOrb);
resizeOrb();

// Orb state
let forceHover = false;   // becomes true on search
let targetHover = 0;
let currentRot = 0;

orbContainer.addEventListener('mousemove', e => {
    const rect = orbContainer.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const size = Math.min(rect.width, rect.height);
    const uvX = ((x - rect.width * 0.5) / size) * 2;
    const uvY = ((y - rect.height * 0.5) / size) * 2;
    targetHover = Math.sqrt(uvX * uvX + uvY * uvY) < 0.8 ? 1 : 0;
});
orbContainer.addEventListener('mouseleave', () => { if (!forceHover) targetHover = 0; });

let raf, lastT = 0;
function updateOrb(t) {
    raf = requestAnimationFrame(updateOrb);
    const dt = (t - lastT) * 0.001; lastT = t;
    program.uniforms.iTime.value = t * 0.001;
    const effHover = forceHover ? 1 : targetHover;
    program.uniforms.hover.value += (effHover - program.uniforms.hover.value) * 0.1;
    if (effHover > 0.5) currentRot += dt * 0.3;
    program.uniforms.rot.value = currentRot;
    renderer.render({ scene: mesh });
}
requestAnimationFrame(updateOrb);


// loading inside orb
function setOrbText(type, msg) {
    const orbText = document.getElementById('orbText');
    const orbMsg = document.getElementById('orbMsg');
    const orbSpinner = document.getElementById('orbSpinner');

    if (type === 'loading') {
        orbSpinner.style.display = 'block';
        orbMsg.textContent = msg || 'Fetching...';
        orbText.classList.add('visible');
    } else if (type === 'error') {
        orbSpinner.style.display = 'none';
        orbMsg.textContent = '⚠ ' + msg;
        orbText.classList.add('visible');
    } else {
        // clear
        orbText.classList.remove('visible');
        orbSpinner.style.display = 'none';
        orbMsg.textContent = '';
    }
}


// ─── Weather logic ──────────────────────────────────────────────

let currentCity = '';

document.getElementById('cityInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchWeather();
});

async function fetchWeather() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) return;
    currentCity = city;

    // Activate orb
    forceHover = true;
    
    // Reset orb for new search
    const orbWrap = document.querySelector('.orb-wrap');
    orbWrap.style.display = 'flex';
    orbWrap.classList.remove('orb-explode');

    // Reset weather card animations
    document.getElementById('weatherCard').classList.remove('weather-reveal');
    document.getElementById('forecastSection').classList.remove('weather-reveal');

    setOrbText('loading', 'Fetching\nWeather...');
    document.getElementById('weatherCard').style.display = 'none';
    document.getElementById('forecastSection').style.display = 'none';

    try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        const data = await res.json();

        if (!res.ok) {
            forceHover = false;
            setOrbText('error', data.detail || 'City not found');
            return;
        }

        setOrbText('clear');
        renderWeather(data);

    } catch (e) {
        forceHover = false;
        setOrbText('error', 'Could not connect to server.');
    }
}

function renderWeather(data) {
    const c = data.current;

    // 💥 Trigger orb explosion
    const orbWrap = document.querySelector('.orb-wrap');
    orbWrap.classList.add('orb-explode');

    // Wait for explosion to finish, then show weather
    setTimeout(() => {
        // Hide orb completely
        orbWrap.style.display = 'none';

        // Populate weather data
        document.getElementById('cityName').textContent = data.city;
        document.getElementById('cityCountry').textContent = data.country;
        const now = new Date();
const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
document.getElementById('cityDatetime').innerHTML = `${dateStr}<br/>${timeStr.toUpperCase()}`;
        document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${c.icon}@2x.png`;
        document.getElementById('tempVal').innerHTML = `${c.temp}<span class="temp-unit">°C</span>`;
        document.getElementById('weatherDesc').textContent = c.description;
        document.getElementById('feelsLike').textContent = `Feels like ${c.feels_like}°C`;
        document.getElementById('humidity').innerHTML = `${c.humidity}<span class="stat-unit"> %</span>`;
        document.getElementById('windSpeed').innerHTML = `${c.wind_speed}<span class="stat-unit"> km/h</span>`;
        document.getElementById('pressure').innerHTML = `${c.pressure}<span class="stat-unit"> hPa</span>`;
        document.getElementById('visibility').innerHTML = `${c.visibility}<span class="stat-unit"> km</span>`;

        const grid = document.getElementById('forecastGrid');
        grid.innerHTML = '';
        data.forecast.forEach(day => {
            grid.innerHTML += `
              <div class="forecast-card">
                <div class="forecast-day">${day.date}</div>
                <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt=""/>
                <div class="forecast-desc">${day.description}</div>
                <div class="forecast-temps">
                  <span class="f-temp-high">${day.temp_max}°</span>
                  <span class="f-temp-low">${day.temp_min}°</span>
                </div>
              </div>`;
        });

        // Show weather cards with fade-in
        const weatherCard = document.getElementById('weatherCard');
        const forecastSection = document.getElementById('forecastSection');
        weatherCard.style.display = 'block';
        forecastSection.style.display = 'block';
        weatherCard.classList.add('weather-reveal');
        forecastSection.classList.add('weather-reveal');

        document.getElementById('downloadBtn').onclick = () => {
            window.location.href = `/api/download?city=${encodeURIComponent(currentCity)}`;
        };

    }, 600); // matches animation duration
}

function showError(msg) {
    const el = document.getElementById('errorMsg');
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
}