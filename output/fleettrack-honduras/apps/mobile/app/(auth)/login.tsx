import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native'
import { supabase } from '~/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales inválidas. Verifica con tu administrador.')
      setLoading(false)
      return
    }

    // Navigation handled by root _layout
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo area */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-primary rounded-3xl items-center justify-center mb-4 shadow-lg">
            <Text className="text-4xl">🚛</Text>
          </View>
          <Text className="text-2xl font-bold text-text-primary">FleetTrack</Text>
          <Text className="text-sm text-text-secondary mt-1">App Motorista</Text>
        </View>

        {/* Form */}
        <View className="bg-surface rounded-2xl p-6 shadow-sm border border-border">
          <Text className="text-lg font-semibold text-text-primary mb-5">Iniciar sesión</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-text-primary mb-1.5">Correo electrónico</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              className="h-12 px-4 border border-border rounded-xl text-text-primary text-base bg-background"
              placeholder="tu@correo.com"
              placeholderTextColor="#6E6E73"
            />
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-text-primary mb-1.5">Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              className="h-12 px-4 border border-border rounded-xl text-text-primary text-base bg-background"
              placeholder="••••••••"
              placeholderTextColor="#6E6E73"
            />
          </View>

          {error ? (
            <View className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="h-14 bg-primary rounded-xl items-center justify-center"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-center text-xs text-text-secondary mt-6">
          Solo acceso para motoristas autorizados.{'\n'}
          Contacta a tu administrador si tienes problemas.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
