﻿using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

using SkbKontur.DbViewer.Configuration;
using SkbKontur.DbViewer.DataTypes;

namespace SkbKontur.DbViewer.Helpers
{
    public static class ObjectsConverter
    {
        public static object StoredToApi(TypeMetaInformation typeMeta, Type type, object? o, ICustomPropertyConfigurationProvider? customPropertyConfigurationProvider)
        {
            if (o == null)
                return null;

            if (o is IDictionary dictionary)
                return dictionary.Keys.Cast<object>().ToDictionary(
                    k => k,
                    k => StoredToApi(
                        typeMeta.GenericTypeArguments[1],
                        type.GetGenericArguments()[1],
                        dictionary[k], customPropertyConfigurationProvider
                    )
                );

            if (!PropertyHelpers.IsSimpleType(type) && type != typeof(byte[]) && o is IEnumerable enumerable)
            {
                var itemType = type.HasElementType ? type.GetElementType() : type.GetGenericArguments()[0];
                var itemConfigurator = customPropertyConfigurationProvider?.TryGetConfiguration(itemType);
                // todo (p.vostretsov, 22.04.2020): Use itemConfigurator
                return enumerable.Cast<object>().Select(
                    x => StoredToApi(
                        typeMeta.GenericTypeArguments[0],
                        itemType, x, customPropertyConfigurationProvider
                    )
                );
            }

            if (!typeMeta.Properties.Any())
                return o;

            var result = new Dictionary<string, object>();
            foreach (var property in typeMeta.Properties)
            {
                var propertyInfo = type.GetProperty(property.Name);
                var propertyValue = propertyInfo.GetValue(o);
                var customPropertyConfiguration = customPropertyConfigurationProvider?.TryGetConfiguration(o, propertyInfo);
                var resolvedProperty = customPropertyConfiguration != null ? customPropertyConfiguration.StoredToApi(propertyValue) : propertyValue;
                var resolvedType = resolvedProperty?.GetType() ?? customPropertyConfiguration?.ResolvedType ?? propertyInfo.PropertyType;
                result[property.Name] = StoredToApi(property.Type, resolvedType, resolvedProperty, customPropertyConfigurationProvider);
            }

            return result;
        }
    }
}