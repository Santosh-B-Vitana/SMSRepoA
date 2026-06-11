import { View, Text, Pressable } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-4xl font-bold text-gray-800 mb-2">404</Text>
        <Text className="text-lg text-gray-500 mb-8 text-center">
          This screen does not exist.
        </Text>
        <Link href="/" asChild>
          <Pressable className="bg-primary px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold text-base">Go to Home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}
