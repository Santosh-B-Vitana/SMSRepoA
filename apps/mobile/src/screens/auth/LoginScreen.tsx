import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Animated, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getApiError } from '../../utils/errors';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';

const INDIGO = '#4F46E5';
const INDIGO_DARK = '#4338CA';
const INDIGO_LIGHT = '#E0E7FF';
const BG_LIGHT = '#F9FAFB';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6B7280';
const ERROR_RED = '#EF4444';
const SUCCESS_GREEN = '#10B981';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState<'username' | 'password' | null>(null);

  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formY = useRef(new Animated.Value(60)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your credentials');
      return;
    }
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(getApiError(err));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG_LIGHT }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg }}>
            {/* Logo & Brand */}
            <Animated.View
              style={{
                alignItems: 'center',
                marginBottom: SPACING.xl * 1.5,
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
              }}
            >
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: SPACING.md,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 16,
                  elevation: 12,
                }}
              >
                <Text style={{ fontSize: 32, color: '#fff' }}>🏫</Text>
              </View>
              <Text style={{ ...TYPOGRAPHY.title, color: TEXT_PRIMARY, marginBottom: SPACING.xs }}>
                Vitana Parent Portal
              </Text>
              <Text style={{ ...TYPOGRAPHY.caption, color: TEXT_SECONDARY }}>
                Track your child's progress in real time
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View
              style={{
                transform: [{ translateY: formY }],
                opacity: formOpacity,
              }}
            >
              {/* Username Field */}
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={{ ...TYPOGRAPHY.label, color: TEXT_PRIMARY, marginBottom: SPACING.sm }}>
                  Email or Username
                </Text>
                <View
                  style={{
                    borderWidth: 1.5,
                    borderColor: activeField === 'username' ? INDIGO : '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.md,
                    backgroundColor: activeField === 'username' ? '#FFFFFF' : '#F3F4F6',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, marginRight: SPACING.sm }}>👤</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      ...TYPOGRAPHY.body,
                      color: TEXT_PRIMARY,
                    }}
                    placeholder="arjun.sharma"
                    placeholderTextColor={TEXT_SECONDARY}
                    value={username}
                    onChangeText={(text) => { setUsername(text); setError(''); }}
                    onFocus={() => setActiveField('username')}
                    onBlur={() => setActiveField(null)}
                    autoCapitalize="none"
                    autoComplete="username"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={{ marginBottom: SPACING.lg }}>
                <Text style={{ ...TYPOGRAPHY.label, color: TEXT_PRIMARY, marginBottom: SPACING.sm }}>
                  Password
                </Text>
                <View
                  style={{
                    borderWidth: 1.5,
                    borderColor: activeField === 'password' ? INDIGO : '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.md,
                    backgroundColor: activeField === 'password' ? '#FFFFFF' : '#F3F4F6',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, marginRight: SPACING.sm }}>🔐</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      ...TYPOGRAPHY.body,
                      color: TEXT_PRIMARY,
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={TEXT_SECONDARY}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => { setPassword(text); setError(''); }}
                    onFocus={() => setActiveField('password')}
                    onBlur={() => setActiveField(null)}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: SPACING.sm }}
                  >
                    <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Alert */}
              {error && (
                <View
                  style={{
                    backgroundColor: '#FEE2E2',
                    borderLeftWidth: 4,
                    borderLeftColor: ERROR_RED,
                    borderRadius: 8,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.sm,
                    marginBottom: SPACING.lg,
                  }}
                >
                  <Text style={{ ...TYPOGRAPHY.caption, color: ERROR_RED, fontWeight: '600' }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Sign In Button */}
              <TouchableOpacity
                disabled={isLoading}
                onPress={handleLogin}
                style={{
                  backgroundColor: isLoading ? '#9CA3AF' : INDIGO,
                  borderRadius: 12,
                  paddingVertical: SPACING.md + 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  shadowColor: INDIGO,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 8,
                  marginBottom: SPACING.lg,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={{ fontSize: 18, marginRight: SPACING.sm }}>✓</Text>
                    <Text style={{ ...TYPOGRAPHY.button, color: '#FFFFFF' }}>Sign In</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Dev Credentials (DEV ONLY) */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={() => {
                    setUsername('arjun.sharma');
                    setPassword('parent-dev-change-me');
                  }}
                  style={{ padding: SPACING.xs }}
                >
                  <Text style={{ ...TYPOGRAPHY.caption, color: TEXT_SECONDARY, textAlign: 'center' }}>
                    🔧 DEV: Tap to fill demo credentials
                  </Text>
                </TouchableOpacity>
              )}

              {/* Forgot Password Link */}
              <View style={{ alignItems: 'center', marginTop: SPACING.md }}>
                <TouchableOpacity>
                  <Text style={{ ...TYPOGRAPHY.caption, color: INDIGO, fontWeight: '600' }}>
                    Forgot your password?
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Security Badge */}
            <View
              style={{
                marginTop: SPACING.xl * 2,
                paddingHorizontal: SPACING.md,
                paddingVertical: SPACING.md,
                backgroundColor: '#F0F9FF',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#BFDBFE',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, marginBottom: SPACING.xs }}>🔒</Text>
              <Text style={{ ...TYPOGRAPHY.caption, color: '#1E40AF', textAlign: 'center', fontWeight: '500' }}>
                Your data is encrypted and secure. We never share your information.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
