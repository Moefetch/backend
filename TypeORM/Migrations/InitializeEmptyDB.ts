import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeEmptyDB implements MigrationInterface {

    async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
                `CREATE TABLE "Albums" (
                    "id" varchar NOT NULL,
                    "albumCoverImage" varchar NOT NULL,
                    "name" varchar NOT NULL,
                    "uuid" varchar NOT NULL,
                    "type" varchar NOT NULL,
                    "estimatedPicCount" integer NOT NULL,
                    "isHidden" boolean NOT NULL,
                    PRIMARY KEY("id")
                );
                CREATE TABLE "Tags" ("tag" varchar PRIMARY KEY NOT NULL, "category" varchar, CONSTRAINT "UQ_6cfaa9943a6e18a1722aee264cf" UNIQUE ("tag"));
                CREATE TABLE "Media" ("id" varchar PRIMARY KEY NOT NULL, "file" varchar NOT NULL, "thumbnailFile" varchar, "isVideo" boolean NOT NULL, "alternative_names" text, "imageSize" text, "index" integer NOT NULL, "tags" text, "artists" text, "isNSFW" boolean, "links" text, "ids" text, "date_created" integer, "text" varchar, "parentEntryId" varchar, "album" TEXT NOT NULL, PRIMARY KEY("id"));
                `
        );
    }
    async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
                `DROP TABLE "Albums";
                DROP TABLE "Tags";
                DROP TABLE "Media";`
        );
    }
}