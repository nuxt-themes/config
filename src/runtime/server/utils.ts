import { useStorage } from '#imports'

export const useTheme = async () => {
  const storage = useStorage()

  return await storage.getItem('cache:theme:options.json')
}
