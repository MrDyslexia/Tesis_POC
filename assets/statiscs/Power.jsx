import * as React from "react"
import Svg, { Path } from "react-native-svg"
const Power = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    className="lucide lucide-power"
    {...props}
  >
    <Path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.77.04" />
  </Svg>
)
export default Power