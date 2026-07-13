import { useWindowDimensions } from 'react-native';

export type BreakpointInfo = {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

export function useBreakpoint(): BreakpointInfo {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}

export default useBreakpoint;
