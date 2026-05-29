/**
 * VisitorPlaceholder — pixel-faithful recreation of the Babysits visitor screen.
 * Layout: gray hint card → fluffy yeti mascot → "Connexion" button pinned to bottom.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Ellipse, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

/* ─────────────────────────────────────────────────────────────────────────────
   Fluffy Yeti — a faithful react-native-svg vector recreation of the Babysits
   mascot: an ice-blue fluffy monster cuddling a darker-teal cat that holds a ball.
───────────────────────────────────────────────────────────────────────────── */
const BODY   = '#A9DEE0';   // main fluffy body
const BODY_D = '#93D2D5';   // body shade for depth
const INNER  = '#2F95A3';   // inner cat – deep teal
const INNER_D= '#247E8B';   // cat shade
const HEAD   = '#D7F0F0';   // cat head – pale teal-white
const DARK   = '#234E54';   // eyes / details

function FluffyYeti() {
  return (
    <Svg width={210} height={250} viewBox="0 0 210 250">
      <Defs>
        <SvgGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={BODY} />
          <Stop offset="1" stopColor={BODY_D} />
        </SvgGradient>
        <SvgGradient id="catGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={INNER} />
          <Stop offset="1" stopColor={INNER_D} />
        </SvgGradient>
      </Defs>

      {/* ── Soft ground shadow ── */}
      <Ellipse cx="105" cy="236" rx="58" ry="11" fill="rgba(0,0,0,0.08)" />

      {/* ── Fluffy body: one rounded blob with a scalloped/furry top edge ── */}
      <Path
        d="
          M105 30
          C118 30 122 44 134 44
          C146 44 150 32 161 36
          C172 40 167 56 176 62
          C188 70 198 86 198 112
          C198 175 162 224 105 224
          C48 224 12 175 12 112
          C12 86 22 70 34 62
          C43 56 38 40 49 36
          C60 32 64 44 76 44
          C88 44 92 30 105 30
          Z"
        fill="url(#bodyGrad)"
      />

      {/* ── Top fur tufts for the fluffy look ── */}
      <Path d="M86 40 C82 22 96 16 100 34 Z" fill={BODY} />
      <Path d="M105 36 C103 14 119 14 116 36 Z" fill={BODY} />
      <Path d="M124 40 C124 20 140 22 132 40 Z" fill={BODY} />

      {/* ── Body highlight ── */}
      <Ellipse cx="62" cy="92" rx="20" ry="24" fill="#C6ECEE" opacity={0.45} />

      {/* ── Yeti eyes ── */}
      <Ellipse cx="90" cy="104" rx="6" ry="8" fill={DARK} />
      <Ellipse cx="120" cy="104" rx="6" ry="8" fill={DARK} />
      <Circle cx="92" cy="101" r="1.8" fill="#FFFFFF" />
      <Circle cx="122" cy="101" r="1.8" fill="#FFFFFF" />

      {/* ── Inner cat ── */}
      {/* cat body */}
      <Path
        d="M80 224 C72 196 78 162 105 162 C132 162 138 196 130 224 Z"
        fill="url(#catGrad)"
      />
      {/* cat tail curling */}
      <Path
        d="M130 210 C150 210 154 188 142 184 C150 192 140 200 128 198 Z"
        fill={INNER_D}
      />
      {/* cat head */}
      <Circle cx="105" cy="150" r="27" fill={HEAD} />
      {/* cat ears */}
      <Path d="M85 134 L82 116 L99 128 Z" fill={INNER} />
      <Path d="M125 134 L128 116 L111 128 Z" fill={INNER} />
      <Path d="M86 131 L85 122 L94 128 Z" fill={HEAD} />
      <Path d="M124 131 L125 122 L116 128 Z" fill={HEAD} />
      {/* cat eyes */}
      <Circle cx="97" cy="150" r="3.2" fill={DARK} />
      <Circle cx="113" cy="150" r="3.2" fill={DARK} />
      {/* cat nose + mouth */}
      <Path d="M103 158 L107 158 L105 161 Z" fill={INNER} />
      <Path d="M105 161 C105 165 101 165 100 163 M105 161 C105 165 109 165 110 163"
            stroke={DARK} strokeWidth={1} fill="none" />
      {/* cat paw + ball */}
      <Circle cx="132" cy="196" r="9" fill={INNER} />
      <Circle cx="139" cy="201" r="11" fill={HEAD} opacity={0.92} />
      <Circle cx="139" cy="201" r="11" stroke={INNER} strokeWidth={1.4} fill="none" />

      {/* ── Feet ── */}
      <Ellipse cx="82" cy="222" rx="16" ry="10" fill={BODY_D} />
      <Ellipse cx="128" cy="222" rx="16" ry="10" fill={BODY_D} />
    </Svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   VisitorPlaceholder screen
───────────────────────────────────────────────────────────────────────────── */
interface Props {
  hint: string;
}

export function VisitorPlaceholder({ hint }: Props) {
  const router = useRouter();

  return (
    <View style={s.container}>

      {/* ① Gray hint card with lightbulb */}
      <View style={s.hintCard}>
        <View style={s.hintIconWrap}>
          <Ionicons name="bulb-outline" size={20} color="#9CA3AF" />
        </View>
        <Text style={s.hintText}>{hint}</Text>
      </View>

      {/* ② Yeti mascot centered */}
      <View style={s.mascotArea}>
        <FluffyYeti />
      </View>

      {/* ③ Push button to bottom */}
      <View style={{ flex: 1 }} />

      {/* ④ Single "Connexion" button */}
      <TouchableOpacity
        style={s.connexionBtn}
        onPress={() => router.push('/login')}
        activeOpacity={0.88}
      >
        <Text style={s.connexionText}>Connexion</Text>
      </TouchableOpacity>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },

  /* Hint card */
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F1F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 4,
  },
  hintIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E4E5EA',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  hintText: {
    flex: 1,
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
    lineHeight: 21,
  },

  /* Mascot */
  mascotArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    paddingBottom: 16,
  },

  /* Connexion button */
  connexionBtn: {
    backgroundColor: '#0C9193',
    borderRadius: 32,
    paddingVertical: 17,
    alignItems: 'center',
  },
  connexionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
