CREATE TABLE IF NOT EXISTS `properties` (
  `id` int AUTO_INCREMENT NOT NULL,
  `propertyNo` varchar(32) NOT NULL,
  `houseNo` varchar(128) NOT NULL,
  `ownerId` int,
  `ownerName` varchar(160) NOT NULL,
  `address` text NOT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `properties_id` PRIMARY KEY(`id`),
  CONSTRAINT `properties_propertyNo_unique` UNIQUE(`propertyNo`),
  CONSTRAINT `properties_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `bills` (
  `id` int AUTO_INCREMENT NOT NULL,
  `propertyId` int NOT NULL,
  `billType` enum('property_tax','water','electricity') NOT NULL,
  `amount` int NOT NULL,
  `dueDate` timestamp NOT NULL,
  `status` enum('unpaid','paid','partially_paid','overdue') NOT NULL DEFAULT 'unpaid',
  `receiptUrl` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `bills_id` PRIMARY KEY(`id`),
  CONSTRAINT `bills_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `billId` int NOT NULL,
  `userId` int NOT NULL,
  `amount` int NOT NULL,
  `reference` varchar(64) NOT NULL,
  `status` enum('success','pending','failed') NOT NULL DEFAULT 'success',
  `paidAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `payments_id` PRIMARY KEY(`id`),
  CONSTRAINT `payments_reference_unique` UNIQUE(`reference`),
  CONSTRAINT `payments_billId_bills_id_fk` FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
