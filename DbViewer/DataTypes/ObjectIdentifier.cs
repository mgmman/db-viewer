﻿using Newtonsoft.Json;

namespace SkbKontur.DbViewer.DataTypes
{
    public class ObjectIdentifier
    {
        [NotNull]
        [JsonProperty("identifier")]
        public string Identifier { get; set; }

        [NotNull]
        [JsonProperty("schemaDescription")]
        public SchemaDescription SchemaDescription { get; set; }
    }
}