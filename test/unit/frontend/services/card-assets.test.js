const should = require('should');
const sinon = require('sinon');

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

const cardAssetService = require('../../../../core/frontend/services/card-assets');
const CardAssetService = require('../../../../core/frontend/services/card-assets/service');

const themeEngine = require('../../../../core/frontend/services/theme-engine');

describe('Card Asset Init', function () {
    it('calls loader with config', function () {
        sinon.stub(themeEngine, 'getActive').returns({
            config: function (key) {
                if (key === 'card_assets') {
                    return 'random-test-value';
                }
            }
        });

        let serviceStub = sinon.stub(cardAssetService, 'load');

        cardAssetService.init();
        serviceStub.calledOnce.should.eql(true);
        serviceStub.calledWith('random-test-value').should.eql(true);
    });
});

describe('Card Asset Service', function () {
    let testDir,
        srcDir,
        destDir;

    before(async function () {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ghost-tests-'));
        srcDir = path.join(testDir, 'src');
        destDir = path.join(testDir, 'dest');

        await fs.mkdir(srcDir);
        await fs.mkdir(destDir);
        await fs.mkdir(path.join(srcDir, 'css'));
        await fs.mkdir(path.join(srcDir, 'js'));
    });

    after(async function () {
        await fs.rmdir(testDir, {recursive: true});
    });

    it('can load nothing', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await cardAssets.load();

        cardAssets.files.should.eql([]);
    });

    it('can load a single css file', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(srcDir, 'css', 'test.css'), '.test { color: #fff }');

        await cardAssets.load(true);

        cardAssets.files.should.eql(['cards.min.css']);
    });

    it('can clearFiles', async function () {
        const cardAssets = new CardAssetService({
            src: srcDir,
            dest: destDir
        });

        await fs.writeFile(path.join(destDir, 'cards.min.css'), 'test-css');
        await fs.writeFile(path.join(destDir, 'cards.min.js'), 'test-js');

        await cardAssets.clearFiles();

        try {
            await fs.readFile(path.join(destDir, 'cards.min.css'), 'utf-8');
            should.fail(cardAssets, 'CSS file should not exist');
        } catch (error) {
            if (error instanceof should.AssertionError) {
                throw error;
            }

            error.code.should.eql('ENOENT');
        }

        try {
            await fs.readFile(path.join(destDir, 'cards.min.js'), 'utf-8');
            should.fail(cardAssets, 'JS file should not exist');
        } catch (error) {
            if (error instanceof should.AssertionError) {
                throw error;
            }

            error.code.should.eql('ENOENT');
        }
    });

    describe('Generate the correct glob strings', function () {
        // @TODO: change the default
        it('DEFAULT CASE: do nothing [temp]', function () {
            const cardAssets = new CardAssetService();

            cardAssets.generateGlobs().should.eql({});
        });

        it('CASE: card_assets = true, all cards assets should be included', function () {
            const cardAssets = new CardAssetService({
                config: true
            });

            cardAssets.generateGlobs().should.eql({
                'cards.min.css': 'css/*.css',
                'cards.min.js': 'js/*.js'
            });
        });

        it('CASE: card_assets = false, no card assets should be included', function () {
            const cardAssets = new CardAssetService({
                config: false
            });

            cardAssets.generateGlobs().should.eql({});
        });

        it('CASE: card_assets is an object with an exclude property, generate inverse match strings', function () {
            const cardAssets = new CardAssetService({
                config: {
                    exclude: ['bookmarks']
                }
            });

            cardAssets.generateGlobs().should.eql({
                'cards.min.css': 'css/!(bookmarks).css',
                'cards.min.js': 'js/!(bookmarks).js'
            });
        });

        it('CASE: card_assets is an object with an include property, generate match strings', function () {
            const cardAssets = new CardAssetService({
                config: {
                    include: ['gallery']
                }
            });

            cardAssets.generateGlobs().should.eql({
                'cards.min.css': 'css/(gallery).css',
                'cards.min.js': 'js/(gallery).js'
            });
        });

        it('CASE: card_assets has include and exclude, include should win', function () {
            const cardAssets = new CardAssetService({
                config: {
                    include: ['gallery'],
                    exclude: ['bookmark']
                }
            });

            cardAssets.generateGlobs().should.eql({
                'cards.min.css': 'css/(gallery).css',
                'cards.min.js': 'js/(gallery).js'
            });
        });
    });
});
