import React from 'react';
import PropTypes from 'prop-types';

const SVGBase = ({ children, size, style, width, height, ...props }) => {
  const computedSize = size || '1em';
  return (
    <svg
      children={children}
      fill="currentColor"
      preserveAspectRatio="xMidYMid meet"
      height={height || computedSize}
      width={width || computedSize}
      {...props}
      style={{
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );
};

SVGBase.propTypes = {
  size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  style: PropTypes.object,
};

export default SVGBase;
