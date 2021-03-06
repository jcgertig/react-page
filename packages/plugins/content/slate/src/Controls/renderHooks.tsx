import isObject from 'lodash.isobject';
import React, { DependencyList, useCallback } from 'react';
import {
  RenderElementProps,
  RenderLeafProps,
  useSelected,
  useFocused,
} from 'slate-react';
import { SlatePlugin } from '../types/SlatePlugin';
import {
  useComponentMarkPlugins,
  useComponentNodePlugins,
} from './pluginHooks';
import { getTextContents } from '../utils/getTextContent';

export const useRenderElement = (
  {
    plugins,
    defaultPluginType,
  }: { plugins: SlatePlugin[]; defaultPluginType: string },
  deps: DependencyList
) => {
  const componentPlugins = useComponentNodePlugins({ plugins }, deps);

  return useCallback(
    ({
      element: { type, data = {}, children: childNodes },
      children,
      attributes,
    }: RenderElementProps) => {
      const matchingPlugin =
        componentPlugins.find((plugin) => plugin.type === type) ??
        componentPlugins.find((plugin) => plugin.type === defaultPluginType);

      if (matchingPlugin) {
        const { Component, getStyle } = matchingPlugin;

        const style = getStyle ? getStyle(data || {}) : {};
        const baseProps = {
          children,
          style,
        };

        if (typeof Component === 'string' || Component instanceof String) {
          // simple component like "p"
          return <Component {...attributes} {...baseProps} />;
        }

        Component.displayName = 'SlatePlugin(' + matchingPlugin.type + ')';
        // usefull in certain cases
        const additionalProps = {
          childNodes,
          getTextContents: () => getTextContents(childNodes),
          useSelected,
          useFocused,
        };
        return (
          <Component
            {...data}
            // attributes have to be spread in manually because of ref problem
            attributes={attributes}
            {...additionalProps}
            {...baseProps}
          />
        );
      }
      return <p>unknown component {type}</p>;
    },
    deps
  );
};

export const useRenderLeave = (
  { plugins }: { plugins: SlatePlugin[] },
  deps: DependencyList
) => {
  const markPlugins = useComponentMarkPlugins({ plugins }, deps);

  return useCallback(
    ({
      leaf: { text, ...leaveTypes },
      attributes,
      children,
    }: RenderLeafProps) => {
      return (
        <span {...attributes}>
          {Object.keys(leaveTypes).reduce((el, type) => {
            const matchingPlugin = markPlugins.find(
              (plugin) => plugin.type === type
            );
            if (matchingPlugin) {
              const { Component, getStyle } = matchingPlugin;
              const dataRaw = leaveTypes[type]; // usually boolean
              const data = isObject(dataRaw) ? dataRaw : {};
              const style = getStyle ? getStyle(data) : {};
              if (
                typeof Component === 'string' ||
                Component instanceof String
              ) {
                return <Component style={style}>{el}</Component>;
              }
              return (
                <Component
                  childNodes={[{ text }]}
                  getTextContents={() => [text]}
                  useSelected={useSelected}
                  useFocused={useFocused}
                  {...data}
                  style={style}
                >
                  {el}
                </Component>
              );
            }
            return el;
          }, children)}
        </span>
      );
    },
    deps
  );
};
