﻿using System;
using System.Linq;
using System.Threading.Tasks;

using Cassandra.Data.Linq;

using FluentAssertions;

using GroBuf;
using GroBuf.DataMembersExtracters;

using NUnit.Framework;

using SkbKontur.DbViewer.TestApi.Cql;
using SkbKontur.DbViewer.Tests.FrontTests.Pages;
using SkbKontur.DbViewer.Tests.FrontTests.Playwright;

namespace SkbKontur.DbViewer.Tests.FrontTests
{
    public class ShowTableEntriesPageTests
    {
        /// <summary>
        ///     Не заполняем поле и кликаем найти, должно выдавать ошибку валидации
        ///     Заполняем поле неверным id и нам ничего не находит
        ///     Заполняем поле правильным id и нам выдает 1 запись
        /// </summary>
        [Test]
        public async Task TestObjectKeysValidation()
        {
            var printingInfo = CqlDocumentsForTests.GetCqlDocumentPrintingInfo();
            var printingInfoId = printingInfo.Id.ToString();

            using (var context = new CqlDbContext())
                context.InsertDocument(printingInfo);

            await using var browser = new Browser();
            var showTableEntriesPage = await browser.SwitchTo<PwBusinessObjectTablePage>("DocumentPrintingInfo");

            await showTableEntriesPage.OpenFilter.Click();
            await showTableEntriesPage.FilterModal.Apply.Click();
            var searchField = await showTableEntriesPage.FilterModal.GetFilter("Id");
            await searchField.InputValidation.ExpectIsOpenedWithMessage("Поле должно быть заполнено");
            await searchField.Input.ClearAndInputText(Guid.NewGuid().ToString());
            await showTableEntriesPage.FilterModal.Apply.Click();

            await showTableEntriesPage.BusinessObjectItems.WaitAbsence();
            await showTableEntriesPage.NothingFound.WaitPresence();

            await showTableEntriesPage.OpenFilter.Click();
            searchField = await showTableEntriesPage.FilterModal.GetFilter("Id");
            await searchField.Input.ClearAndInputText(printingInfoId);
            await showTableEntriesPage.FilterModal.Apply.Click();

            await showTableEntriesPage.BusinessObjectItems.WaitCount(1);
            await showTableEntriesPage.BusinessObjectItems[0].FindColumn("Id").WaitText(printingInfoId);
        }

        /// <summary>
        ///     В кассандре лежит 10 документов с одинаковыми Partition key, но разными Clustering key
        ///     Первые 5 документов имеют DocumentType Invoic, другие 5 - Orders, у всех разные DocumentCirculationId
        ///     Заполняем часть Partition key, нажимаем найти, должна появится ошибка
        ///     Заполняем все PartitionKey и все Clustering key поля, должен найти 1 документ
        ///     Очищаем поля из ClusteringKey, должен найти 10 докуменов
        ///     Заполняем поле DocumentType значением Invoic, второе оставляем пустым, должен найти первые 5 документов
        ///     Выбираем фильтр по DocumentType '>', должен найти последние 5 документов
        /// </summary>
        [Test]
        public async Task TestFindDocumentWithClusteringKeyPart()
        {
            var documents = CqlDocumentsForTests.GetCqlDocumentBindingMetaEntries(serializer);
            var firstPartnerPartyId = documents[0].FirstPartnerPartyId;
            var secondPartnerPartyId = documents[0].SecondPartnerPartyId;

            using (var context = new CqlDbContext())
                context.InsertDocuments(documents);

            await using var browser = new Browser();
            var showTableEntriesPage = await browser.SwitchTo<PwBusinessObjectTablePage>("DocumentBindingsMeta");
            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("BindingType")).EnumSelect.SelectValueByText("ByPriceList");
            await (await showTableEntriesPage.FilterModal.GetFilter("FirstPartnerPartyId")).Input.ClearAndInputText(firstPartnerPartyId);
            await showTableEntriesPage.FilterModal.Apply.Click();

            await (await showTableEntriesPage.FilterModal.GetFilter("SecondPartnerPartyId")).Input.WaitIncorrect();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentNumber")).Input.WaitIncorrect();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentDate")).DateTimeInTicks.WaitIncorrect();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentTime")).DateTimeInTicks.WaitIncorrect();
            await (await showTableEntriesPage.FilterModal.GetFilter("FirstPartnerPartyId")).Input.WaitCorrect();

            await (await showTableEntriesPage.FilterModal.GetFilter("SecondPartnerPartyId")).Input.ClearAndInputText(secondPartnerPartyId);
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentNumber")).Input.ClearAndInputText("0");
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentDate")).Date.ClearAndInputText("10.10.2000");
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentTime")).DateTimeInTicks.ClearAndInputText(new DateTime(2020, 10, 10, 13, 12, 11, DateTimeKind.Utc).Ticks.ToString());

            var documentType = documents[0].DocumentType;
            var documentCirculationId = documents[0].DocumentCirculationId.ToString();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentType")).Input.ClearAndInputText(documentType);
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentCirculationId")).Input.ClearAndInputText(documentCirculationId);

            await showTableEntriesPage.FilterModal.Apply.Click();
            await showTableEntriesPage.BusinessObjectItems.WaitCount(1);
            await showTableEntriesPage.BusinessObjectItems[0].FindColumn("DocumentCirculationId").WaitText(documentCirculationId);

            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentType")).Input.Clear();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentCirculationId")).Input.Clear();
            await showTableEntriesPage.FilterModal.Apply.Click();

            await showTableEntriesPage.BusinessObjectItems.WaitCount(10);
            await showTableEntriesPage.BusinessObjectItems
                                      .Select(row => row.FindColumn("DocumentCirculationId"))
                                      .WaitText(documents.Select(x => x.DocumentCirculationId.ToString()).ToArray());

            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentType")).Input.ClearAndInputText(documentType);
            await showTableEntriesPage.FilterModal.Apply.Click();

            await showTableEntriesPage.BusinessObjectItems.WaitCount(5);
            await showTableEntriesPage.BusinessObjectItems
                                      .Select(row => row.FindColumn("DocumentType"))
                                      .WaitText(Enumerable.Range(0, 5).Select(_ => "Invoic").ToArray());

            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentType")).OperatorSelect.SelectValueByText(">");
            await showTableEntriesPage.FilterModal.Apply.Click();

            await showTableEntriesPage.BusinessObjectItems.WaitCount(5);
            await showTableEntriesPage.BusinessObjectItems
                                      .Select(row => row.FindColumn("DocumentType"))
                                      .WaitText(Enumerable.Range(0, 5).Select(_ => "Orders").ToArray());
        }

        /// <summary>
        ///     Кладем в кассандру 10 документов CqlDocumentBindingMeta с одинаковым PK, но разными CK
        ///     Находим один документ, заполнив PK и CK, удаляем его, проверяем, что осталось 9
        /// </summary>
        [Test]
        public async Task TestDeleteDocumentWithClusteringKeyPart()
        {
            var documents = CqlDocumentsForTests.GetCqlDocumentBindingMetaEntries(serializer);
            var firstPartnerPartyId = documents[0].FirstPartnerPartyId;
            var secondPartnerPartyId = documents[0].SecondPartnerPartyId;
            var documentType = documents[0].DocumentType;
            var documentCirculationId = documents[0].DocumentCirculationId.ToString();

            using (var context = new CqlDbContext())
                context.InsertDocuments(documents);

            await using var browser = new Browser();
            var showTableEntriesPage = await (await browser.LoginAsSuperUser()).SwitchTo<PwBusinessObjectTablePage>("DocumentBindingsMeta");
            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("BindingType")).EnumSelect.SelectValueByText("ByPriceList");
            await (await showTableEntriesPage.FilterModal.GetFilter("FirstPartnerPartyId")).Input.ClearAndInputText(firstPartnerPartyId);
            await (await showTableEntriesPage.FilterModal.GetFilter("SecondPartnerPartyId")).Input.ClearAndInputText(secondPartnerPartyId);
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentNumber")).Input.ClearAndInputText("0");
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentDate")).Date.ClearAndInputText("10.10.2000");
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentTime")).DateTimeInTicks.ClearAndInputText(new DateTime(2020, 10, 10, 13, 12, 11, DateTimeKind.Utc).Ticks.ToString());
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentType")).Input.ClearAndInputText(documentType);
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentCirculationId")).Input.ClearAndInputText(documentCirculationId);
            await showTableEntriesPage.FilterModal.Apply.Click();
            await showTableEntriesPage.BusinessObjectItems.WaitCount(1);
            await showTableEntriesPage.BusinessObjectItems[0].FindColumn("DocumentCirculationId").WaitText(documentCirculationId);
            await showTableEntriesPage.BusinessObjectItems[0].Delete.Click();
            await showTableEntriesPage.ConfirmDeleteObjectModal.Delete.Click();

            showTableEntriesPage = await browser.RefreshUntil(showTableEntriesPage, x => x.NothingFound.Locator.IsVisibleAsync());
            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentType")).Input.Clear();
            await (await showTableEntriesPage.FilterModal.GetFilter("DocumentCirculationId")).Input.Clear();
            await showTableEntriesPage.FilterModal.Apply.Click();
            await showTableEntriesPage.BusinessObjectItems.WaitCount(9);

            GetBindingMeta(documents[0]).Length.Should().Be(0);
        }

        /// <summary>
        ///     Проверяем сортировку и пейджинг
        /// </summary>
        [Test]
        public async Task TestSortDocuments()
        {
            var id = Guid.NewGuid().ToString();
            var documents = Enumerable.Range(0, 100)
                                      .Select(x => new CqlActiveBoxState {PartitionKey = id, BoxId = Guid.NewGuid()})
                                      .ToArray();

            using (var context = new CqlDbContext())
                context.InsertDocuments(documents);

            await using var browser = new Browser();
            var showTableEntriesPage = await browser.SwitchTo<PwBusinessObjectTablePage>("CqlActiveBoxState");
            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("PartitionKey")).Input.ClearAndInputText(id);
            await showTableEntriesPage.FilterModal.Apply.Click();

            await showTableEntriesPage.TableHeader.SortByColumn("Header_BoxId");
            await showTableEntriesPage.TableHeader.SortByColumn("Header_BoxId");
            await showTableEntriesPage.BusinessObjectItems.Select(x => x.FindColumn("BoxId")).WaitText(GetBoxIds(documents));

            await showTableEntriesPage.Paging.Forward.Click();
            await showTableEntriesPage.BusinessObjectItems.Select(x => x.FindColumn("BoxId")).WaitText(GetBoxIds(documents, skip : 20));
            await showTableEntriesPage.Paging.Pages.WaitCount(5);

            await showTableEntriesPage.CountDropdown.CurrentCount.Click();
            await showTableEntriesPage.CountDropdown.Menu[0].Click();
            await showTableEntriesPage.BusinessObjectItems.Select(x => x.FindColumn("BoxId")).WaitText(GetBoxIds(documents, take : 50));
            await showTableEntriesPage.Paging.Pages.WaitCount(2);

            await showTableEntriesPage.CountDropdown.CurrentCount.Click();
            await showTableEntriesPage.CountDropdown.Menu[1].Click();
            await showTableEntriesPage.BusinessObjectItems.Select(x => x.FindColumn("BoxId")).WaitText(GetBoxIds(documents, take : 100));
            await showTableEntriesPage.Paging.WaitAbsence();
        }

        /// <summary>
        ///     Заполняем страницу BlobStorageSlice: SliceId - DateTimeOffset,  SliceShardNumber - sbyte, BlobId - TimeUuid
        ///     Должен найти 1 документ
        ///     Проверяем, что можем удалить документ
        /// </summary>
        [Test]
        public async Task TestFindDocumentWithDifferentColumnTypes()
        {
            var document = CqlDocumentsForTests.GetCqlConnectorDeliveryContext(serializer);
            var document2 = CqlDocumentsForTests.GetCqlConnectorDeliveryContext(serializer);

            using (var context = new CqlDbContext())
                context.InsertDocuments(new[] {document, document2});

            await using var browser = new Browser();
            var showTableEntriesPage = await (await browser.LoginAsSuperUser()).SwitchTo<PwBusinessObjectTablePage>("CqlConnectorDeliveryContext");
            await showTableEntriesPage.OpenFilter.Click();
            await (await showTableEntriesPage.FilterModal.GetFilter("TimeSliceId")).DateTimeInTicks.ClearAndInputText(document.TimeSliceId.UtcTicks.ToString());
            await (await showTableEntriesPage.FilterModal.GetFilter("TimeSliceShardNumber")).Input.ClearAndInputText(document.TimeSliceShardNumber.ToString());
            await (await showTableEntriesPage.FilterModal.GetFilter("ContextId")).Input.ClearAndInputText(document.ContextId.ToString());
            await showTableEntriesPage.FilterModal.Apply.Click();

            await showTableEntriesPage.BusinessObjectItems.WaitCount(1);
            var row = showTableEntriesPage.BusinessObjectItems[0];
            await row.FindColumn("TimeSliceId").WaitText(document.TimeSliceId.ToString("yyyy-MM-ddTHH:mm:ss.ffK"));
            await row.FindColumn("TimeSliceShardNumber").WaitText(document.TimeSliceShardNumber.ToString());
            await row.FindColumn("ContextId").WaitText(document.ContextId.ToString());

            await row.Delete.Click();
            await showTableEntriesPage.ConfirmDeleteObjectModal.Delete.Locator.HighlightAsync();
            await showTableEntriesPage.ConfirmDeleteObjectModal.Delete.Click();
            await browser.RefreshUntil(showTableEntriesPage, x => x.NothingFound.Locator.IsVisibleAsync());

            GetConnectorDeliveryContext(document).Length.Should().Be(0);
            GetConnectorDeliveryContext(document2).Single().Should().BeEquivalentTo(document2);
        }

        private CqlConnectorDeliveryContext[] GetConnectorDeliveryContext(CqlConnectorDeliveryContext deliveryContext)
        {
            using var context = new CqlDbContext();
            return context.GetTable<CqlConnectorDeliveryContext>()
                          .Where(x => x.TimeSliceId == deliveryContext.TimeSliceId
                                      && x.TimeSliceShardNumber == deliveryContext.TimeSliceShardNumber
                                      && x.ContextId == deliveryContext.ContextId)
                          .Execute()
                          .ToArray();
        }

        private DocumentBindingsMeta[] GetBindingMeta(DocumentBindingsMeta meta)
        {
            using var context = new CqlDbContext();
            return context.GetTable<DocumentBindingsMeta>()
                          .Where(x => x.BindingType == meta.BindingType
                                      && x.FirstPartnerPartyId == meta.FirstPartnerPartyId
                                      && x.SecondPartnerPartyId == meta.SecondPartnerPartyId
                                      && x.DocumentNumber == meta.DocumentNumber
                                      && x.DocumentDate == meta.DocumentDate
                                      && x.DocumentTime == meta.DocumentTime
                                      && x.DocumentType == meta.DocumentType
                                      && x.DocumentCirculationId == meta.DocumentCirculationId)
                          .Execute()
                          .ToArray();
        }

        private static string[] GetBoxIds(CqlActiveBoxState[] documents, int skip = 0, int take = 20)
        {
            return documents.Select(x => x.BoxId.ToString()).OrderByDescending(x => x).Skip(skip).Take(take).ToArray();
        }

        private readonly ISerializer serializer = new Serializer(new AllPropertiesExtractor());
    }
}