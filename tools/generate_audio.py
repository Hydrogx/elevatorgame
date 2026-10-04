#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
喵喵电梯公寓 —— 音效生成器
只用 Python 标准库（wave / struct / math），把每个音效写成独立的 WAV 文件，
放在 assets/audio/ 下。想改音色就改这里的参数，然后重新运行：

    python3 tools/generate_audio.py

生成的每个文件都是完整的独立资源，也可以直接用别的音频文件替换。
"""

import math
import os
import random
import struct
import wave

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(HERE, "..", "assets", "audio"))

random.seed(20240501)  # 固定随机种子，保证每次生成结果一致


# --------------------------------------------------------------------------
# 基础工具
# --------------------------------------------------------------------------
def write_wav(name, samples):
    """把 -1..1 的浮点采样写成 16bit 单声道 WAV。"""
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    frames = bytearray()
    for s in samples:
        v = int(max(-1.0, min(1.0, s)) * 32000)
        frames += struct.pack("<h", v)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))
    print("  wrote %-22s %5.2fs" % (name, len(samples) / SR))


def n(seconds):
    return int(seconds * SR)


def silence(seconds):
    return [0.0] * n(seconds)


def sine(freq, t):
    return math.sin(2 * math.pi * freq * t)


def tri(freq, t):
    x = (t * freq) % 1.0
    return 4 * abs(x - 0.5) - 1


def square(freq, t, duty=0.5):
    return 1.0 if (t * freq) % 1.0 < duty else -1.0


def saw(freq, t):
    return 2 * ((t * freq) % 1.0) - 1


def midi(m):
    return 440.0 * (2 ** ((m - 69) / 12.0))


def adsr(i, total, a=0.01, d=0.1, s=0.7, r=0.2):
    """按采样序号返回 0..1 包络。"""
    t = i / SR
    dur = total / SR
    if t < a:
        return t / max(a, 1e-6)
    if t < a + d:
        return 1.0 - (1.0 - s) * (t - a) / max(d, 1e-6)
    if t < dur - r:
        return s
    return s * max(0.0, (dur - t) / max(r, 1e-6))


def expdecay(i, tau):
    return math.exp(-(i / SR) / max(tau, 1e-6))


def lowpass(samples, cutoff):
    """简单一阶低通，让音色更柔和。"""
    a = math.exp(-2 * math.pi * cutoff / SR)
    out = []
    y = 0.0
    for x in samples:
        y = (1 - a) * x + a * y
        out.append(y)
    return out


def mix(*tracks):
    length = max(len(t) for t in tracks)
    out = [0.0] * length
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    return out


def gain(samples, g):
    return [s * g for s in samples]


def soft_clip(samples, drive=1.0):
    return [math.tanh(s * drive) for s in samples]


def concat(*parts):
    out = []
    for p in parts:
        out.extend(p)
    return out


def noise_burst(seconds, cutoff_hi=6000):
    total = n(seconds)
    raw = [random.uniform(-1, 1) for _ in range(total)]
    return lowpass(raw, cutoff_hi)


def normalize(samples, peak=0.9):
    m = max(abs(s) for s in samples) or 1.0
    return [s / m * peak for s in samples]


# --------------------------------------------------------------------------
# 音效
# --------------------------------------------------------------------------
def sfx_click():
    """按钮：清亮的小水滴声。"""
    total = n(0.075)
    out = []
    for i in range(total):
        t = i / SR
        f = 900 + 700 * (i / total)
        env = math.exp(-(i / SR) / 0.022)
        out.append(0.55 * env * tri(f, t))
    return normalize(out, 0.55)


def sfx_ding():
    """电梯到站：叮——"""
    total = n(1.1)
    out = []
    for i in range(total):
        t = i / SR
        env = math.exp(-(i / SR) / 0.32)
        v = 0.6 * sine(1568, t) + 0.3 * sine(2349, t) + 0.14 * sine(3136, t)
        v += 0.25 * sine(1046, t) * math.exp(-(i / SR) / 0.12)
        out.append(env * v)
    return normalize(out, 0.6)


def sfx_door_open():
    total = n(0.55)
    hiss = gain(lowpass(noise_burst(0.55, 3000), 2200), 0.28)
    out = []
    for i in range(total):
        t = i / SR
        p = i / total
        env = math.sin(math.pi * min(1.0, p * 1.25)) ** 0.8
        glide = 300 + 460 * p
        v = 0.5 * sine(glide, t) * env + hiss[i] * env
        out.append(v)
    return normalize(out, 0.5)


def sfx_door_close():
    total = n(0.45)
    hiss = gain(lowpass(noise_burst(0.45, 2500), 1600), 0.3)
    out = []
    for i in range(total):
        t = i / SR
        p = i / total
        env = math.sin(math.pi * min(1.0, p * 1.1)) ** 0.7
        glide = 700 - 380 * p
        thud = 0.5 * sine(90, t) * math.exp(-(i / SR) / 0.09) if p > 0.86 else 0.0
        out.append(0.45 * sine(glide, t) * env + hiss[i] * env + thud)
    return normalize(out, 0.5)


def sfx_elevator_move():
    """电梯运行时的循环嗡鸣（2 秒无缝循环）。"""
    total = n(2.0)
    out = []
    for i in range(total):
        t = i / SR
        wob = 1 + 0.02 * math.sin(2 * math.pi * 0.5 * t)  # 整周期，保证无缝
        v = 0.6 * sine(58 * wob, t) + 0.3 * sine(116 * wob, t) + 0.12 * sine(174 * wob, t)
        v += 0.05 * (tri(29 * wob, t))
        out.append(v * 0.5)
    return normalize(lowpass(out, 900), 0.32)


def sfx_pop():
    total = n(0.12)
    out = []
    for i in range(total):
        t = i / SR
        p = i / total
        f = 220 + 1100 * (p ** 0.5)
        env = math.exp(-(i / SR) / 0.028)
        out.append(env * (0.7 * sine(f, t) + 0.2 * square(f * 2, t, 0.3)))
    return normalize(out, 0.55)


def sfx_coin():
    """收星星糖：两个音的小铃铛。"""
    def blip(f, dur, amp):
        total = n(dur)
        return [amp * math.exp(-(i / SR) / (dur * 0.32)) * (sine(f, i / SR) + 0.3 * sine(f * 2.01, i / SR))
                for i in range(total)]
    return normalize(concat(blip(1318.5, 0.09, 0.7), blip(1760.0, 0.22, 0.8)), 0.55)


def sfx_success():
    """做成功啦：上行小琶音。"""
    notes = [72, 76, 79, 84]
    out = []
    for k, m in enumerate(notes):
        dur = 0.16 if k < len(notes) - 1 else 0.5
        total = n(dur)
        f = midi(m)
        seg = []
        for i in range(total):
            t = i / SR
            env = math.exp(-(i / SR) / (dur * 0.38))
            seg.append(env * (0.55 * tri(f, t) + 0.25 * sine(f * 2, t) + 0.15 * sine(f * 3, t)))
        out.extend(seg)
    return normalize(out, 0.6)


def sfx_error():
    total = n(0.32)
    out = []
    for i in range(total):
        t = i / SR
        p = i / total
        f = 340 - 150 * p
        env = adsr(i, total, 0.005, 0.06, 0.6, 0.16)
        out.append(env * (0.45 * saw(f, t) + 0.4 * square(f * 0.5, t, 0.5)))
    return normalize(lowpass(out, 1800), 0.45)


def sfx_meow():
    """猫猫叫：滑音 + 颤音，尽量软糯。"""
    total = n(0.62)
    out = []
    for i in range(total):
        t = i / SR
        p = i / total
        # 620 -> 900 -> 480 的滑音
        if p < 0.3:
            f = 620 + (900 - 620) * (p / 0.3)
        else:
            f = 900 - (900 - 480) * ((p - 0.3) / 0.7)
        vib = 1 + 0.035 * math.sin(2 * math.pi * 11 * t)
        env = adsr(i, total, 0.05, 0.12, 0.75, 0.3)
        v = (0.6 * tri(f * vib, t) + 0.35 * sine(f * 2 * vib, t)
             + 0.18 * sine(f * 3 * vib, t) + 0.1 * saw(f * vib, t))
        out.append(v * env * 0.7)
    return normalize(lowpass(out, 3200), 0.5)


def sfx_pour():
    """倒咖啡：循环的液体声（1 秒）。"""
    total = n(1.0)
    raw = [random.uniform(-1, 1) for _ in range(total)]
    body = lowpass(raw, 2400)
    out = []
    for i in range(total):
        t = i / SR
        bub = 0.25 * sine(210 + 40 * math.sin(2 * math.pi * 3 * t), t)
        out.append(0.7 * body[i] + bub)
    return normalize(out, 0.3)


def sfx_gulp():
    """喝一口：可爱的咕咚声。"""
    total = n(0.3)
    out = []
    for i in range(total):
        t = i / SR
        p = i / total
        f = 180 + 260 * math.sin(math.pi * p)
        env = math.sin(math.pi * p) ** 1.5
        out.append(env * (0.6 * sine(f, t) + 0.25 * square(f * 0.5, t, 0.4)))
    return normalize(lowpass(out, 1400), 0.42)


# --------------------------------------------------------------------------
# 背景音乐：甜甜的八小节循环
# --------------------------------------------------------------------------
def bell(f, dur, amp):
    total = n(dur)
    seg = []
    for i in range(total):
        t = i / SR
        seg.append(amp * math.exp(-(i / SR) / (dur * 0.3)) *
                   (0.6 * sine(f, t) + 0.25 * sine(f * 2.0, t) + 0.12 * sine(f * 3.01, t)))
    return seg


def bass_note(f, dur, amp):
    total = n(dur)
    seg = []
    for i in range(total):
        t = i / SR
        env = adsr(i, total, 0.02, 0.2, 0.55, min(0.35, dur * 0.5))
        seg.append(amp * env * (0.7 * sine(f, t) + 0.3 * tri(f, t)))
    return seg


def bgm_lobby():
    """主旋律（C 大调，可爱跳跃感），速度 104 BPM。"""
    bpm = 104.0
    beat = 60.0 / bpm
    step = beat / 2  # 八分音符

    # 主旋律：MIDI 音符，-1 表示休止，长度单位为八分音符
    mel = [
        72, -1, 76, 79, 81, -1, 79, 76,
        74, -1, 77, 81, 83, -1, 81, 77,
        72, -1, 76, 79, 84, -1, 83, 81,
        79, 77, 76, 74, 72, -1, 67, 72,
        69, -1, 72, 76, 77, -1, 76, 72,
        71, -1, 74, 77, 79, -1, 77, 74,
        72, 76, 79, 84, 83, 81, 79, 77,
        76, -1, 72, -1, 67, -1, 72, -1,
    ]
    out = [0.0] * n(len(mel) * step + 1.0)
    for k, m in enumerate(mel):
        if m < 0:
            continue
        seg = bell(midi(m), step * 2.1, 0.36)
        start = n(k * step)
        for i, v in enumerate(seg):
            if start + i < len(out):
                out[start + i] += v

    # 低音：每两拍一个根音
    chords = [
        [48, 55], [48, 55], [53, 60], [53, 60],
        [48, 55], [48, 55], [43, 50], [43, 50],
        [45, 52], [45, 52], [47, 54], [47, 54],
        [48, 55], [48, 55], [43, 50], [43, 50],
    ]
    for k, (r, fifth) in enumerate(chords):
        start = n(k * beat * 2)
        seg = bass_note(midi(r), beat * 1.8, 0.22)
        seg2 = bass_note(midi(fifth), beat * 1.8, 0.08)
        for i in range(len(seg)):
            if start + i < len(out):
                out[start + i] += seg[i] + seg2[i]

    # 沙锤：八分音符轻轻打点
    for k in range(len(mel)):
        start = n(k * step)
        if k % 2 == 0:
            continue
        seg = gain(lowpass(noise_burst(0.035, 9000), 6500), 0.05)
        for i, v in enumerate(seg):
            if start + i < len(out):
                out[start + i] += v

    # 循环接尾：淡入淡出，避免爆音
    fade = n(0.05)
    for i in range(fade):
        out[i] *= i / fade
        out[-(i + 1)] *= i / fade
    return normalize(out, 0.5)


# --------------------------------------------------------------------------
def main():
    print("生成音效 -> %s" % OUT_DIR)
    write_wav("sfx_click.wav", sfx_click())
    write_wav("sfx_ding.wav", sfx_ding())
    write_wav("sfx_door_open.wav", sfx_door_open())
    write_wav("sfx_door_close.wav", sfx_door_close())
    write_wav("sfx_elevator_move.wav", sfx_elevator_move())
    write_wav("sfx_pop.wav", sfx_pop())
    write_wav("sfx_coin.wav", sfx_coin())
    write_wav("sfx_success.wav", sfx_success())
    write_wav("sfx_error.wav", sfx_error())
    write_wav("sfx_meow.wav", sfx_meow())
    write_wav("sfx_pour.wav", sfx_pour())
    write_wav("sfx_gulp.wav", sfx_gulp())
    write_wav("bgm_lobby.wav", bgm_lobby())
    print("完成！")


if __name__ == "__main__":
    main()
