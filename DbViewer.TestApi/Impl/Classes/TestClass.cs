﻿using System;
using System.Collections.Generic;
using System.Reflection;

using Cassandra;

using Newtonsoft.Json.Linq;

using SkbKontur.DbViewer.TestApi.Impl.Attributes;

namespace SkbKontur.DbViewer.TestApi.Impl.Classes
{
    public class TestClass
    {
        [Identity, Indexed]
        public string Id { get; set; }

        public TestClassWithAllPrimitives Content { get; set; }

        [Serialized(typeof(ClassForSerialization))]
        public byte[] Serialized { get; set; }

        public byte[] File { get; set; }

        public DifficultEnum DifficultEnum { get; set; }

        [Serialized(typeof(TestClassResolver))]
        public byte[] DifficultSerialized { get; set; }

        public TestClassWithCustomPrimitives CustomContent { get; set; }
        public LocalDate[] CustomPrimitiveArray { get; set; }
        public TestClassWithCustomPrimitives[] CustomContentArray { get; set; }
        public Dictionary<LocalDate, LocalTime> CustomPrimitiveDict { get; set; }
        public Dictionary<TimeUuid, TestClassWithCustomPrimitives> CustomObjectDict { get; set; }

        public GenericClass<int> GenericIntValues { get; set; }
        public GenericClass<string> GenericStringValues { get; set; }

        public BaseClass[] BaseClass { get; set; }

        public DifficultEnum NotEditable => DifficultEnum.A;
    }

    public enum DifficultEnum
    {
        A,
        B,
    }

    public class TestClassResolver : TypeResolverBase<TestClass>
    {
        protected override Type ResolveObject(TestClass @object, PropertyInfo propertyInfo)
        {
            return GetObjectType(@object.DifficultEnum);
        }

        protected override Type ResolveJson(JObject @object, PropertyInfo propertyInfo)
        {
            var enumValue = @object["DifficultEnum"];
            if (enumValue == null)
                throw new InvalidOperationException("Expected EnumValue to be present");
            return GetObjectType(enumValue.ToObject<DifficultEnum>());
        }

        private static Type GetObjectType(DifficultEnum difficultEnum)
        {
            switch (difficultEnum)
            {
            case DifficultEnum.A:
                return typeof(A);
            case DifficultEnum.B:
                return typeof(B);
            default:
                throw new NotSupportedException();
            }
        }
    }

    public class A
    {
        public int Int { get; set; }
    }

    public class B
    {
        public string String { get; set; }
    }
}