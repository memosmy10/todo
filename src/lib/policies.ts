import { Alert, Linking } from 'react-native';

const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL?.trim() || 'https://todo-pi-five-26.vercel.app/';

export async function openPolicyPage(page: string) {
  try {
    await Linking.openURL(`${websiteUrl.replace(/\/+$/, '')}/${page}`);
  } catch {
    Alert.alert('Could not open the page', 'Please try again or visit the Daylist website in your browser.');
  }
}
